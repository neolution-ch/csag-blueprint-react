import { notifications } from '@mantine/notifications'
import {
    ActionIcon,
    CopyButton,
    Group,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core'
import Axios from 'axios'
import { ClipboardCopy, Check } from 'lucide-react'
import {
    isProblemDetails,
    toProblemDetails,
} from '@collana-solutions/blueprint-core'

/** Every user-visible string the error toast renders. */
export interface ErrorNotificationLabels {
    /** Toast title. */
    title: string
    /** Body used when the server sent no usable detail. */
    genericMessage: string
    /** Prefix for the trace identifier, in the body and in the copied text. */
    traceIdLabel: string
    /** Label and aria-label of the copy control. */
    copy: string
    /** Tooltip shown for a moment after copying. */
    copied: string
}

const defaultLabels: ErrorNotificationLabels = {
    title: 'Something went wrong',
    genericMessage: 'Please try again.',
    traceIdLabel: 'Trace ID',
    copy: 'Copy error details',
    copied: 'Copied',
}

let labels: ErrorNotificationLabels = defaultLabels

/**
 * Override the toast's copy, or pass `null` to restore the English defaults.
 *
 * A module-level setter rather than a parameter because the toast is raised from axios
 * interceptors and from the query client's cache handlers, none of which sit inside the React
 * tree that holds the translations. The app calls this when its resolved language changes,
 * the same bridge `setZodValidationMessages` uses in the zod kit.
 *
 * Partial objects are accepted, and a `null` or non-string leaf keeps that default, so
 * feeding it straight from a translation payload that has not loaded yet is safe.
 */
export function setErrorNotificationLabels(
    next:
        | {
              [K in keyof ErrorNotificationLabels]?: string | null | undefined
          }
        | null,
): void {
    if (!next) {
        labels = defaultLabels
        return
    }

    const merged = { ...defaultLabels }
    for (const [key, value] of Object.entries(next)) {
        if (typeof value === 'string' && value.length > 0) {
            merged[key as keyof ErrorNotificationLabels] = value
        }
    }
    labels = merged
}

function buildClipboardText(problem: {
    title?: string
    status?: number
    detail?: string | null
    traceId?: string
    exception?: string
}): string {
    const lines: string[] = []
    if (problem.title) lines.push(`Title: ${problem.title}`)
    if (problem.status) lines.push(`Status: ${problem.status}`)
    if (problem.detail) lines.push(`Detail: ${problem.detail}`)
    if (problem.traceId)
        lines.push(`${labels.traceIdLabel}: ${problem.traceId}`)
    if (problem.exception) lines.push(`\nException:\n${problem.exception}`)
    return lines.join('\n')
}

/**
 * Show a rich error notification for API errors.
 *
 * Errors from Orval-generated hooks are already ProblemDetails (transformed
 * by the mutator). Errors from direct axios calls are still AxiosErrors.
 * This function handles both, but the primary path is ProblemDetails.
 */
export function showErrorNotification(error: unknown) {
    // Non-browser guard (e.g. unit tests) — Mantine notifications require the DOM.
    if (typeof window === 'undefined') return

    // Resolve a ProblemDetails from whatever error shape we receive:
    // 1. AxiosError with response.data as ProblemDetails (from interceptors)
    // 2. AxiosError without ProblemDetails body (network error) — normalize it
    // 3. Already a ProblemDetails (from React Query hooks — mutator extracts it)
    //
    // IMPORTANT: Check AxiosError FIRST because axios v1+ adds a `status`
    // property to AxiosError, which makes isProblemDetails(axiosError) true.
    let problem: ReturnType<typeof toProblemDetails> | undefined
    if (Axios.isAxiosError(error)) {
        const data: unknown = error.response?.data
        problem = isProblemDetails(data) ? data : toProblemDetails(error)
    } else if (isProblemDetails(error)) {
        problem = error
    }

    const title = labels.title
    // Only surface server-provided detail when a real HTTP response came back.
    // Network errors and locally-thrown JS errors fall back to a generic message
    // so internal exception strings never reach the user.
    const hasServerResponse = !!(problem?.status && problem.status > 0)
    const detail = hasServerResponse
        ? (problem?.detail ?? problem?.title)
        : undefined
    const traceId =
        problem?.traceId && problem.traceId !== 'n/a'
            ? problem.traceId
            : undefined

    const body = detail ?? labels.genericMessage
    const messageText = traceId
        ? `${body}\n${labels.traceIdLabel}: ${traceId}`
        : body

    const clipboardText = problem ? buildClipboardText(problem) : undefined

    notifications.show({
        title,
        message: (
            <Stack gap={4}>
                <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                    {messageText}
                </Text>
                {clipboardText && (
                    <Group gap="xs">
                        <CopyButton value={clipboardText}>
                            {({ copied, copy }) => (
                                <Tooltip
                                    label={copied ? labels.copied : labels.copy}
                                >
                                    <ActionIcon
                                        variant="subtle"
                                        color={copied ? 'teal' : 'gray'}
                                        onClick={copy}
                                        size="sm"
                                        aria-label={labels.copy}
                                    >
                                        {copied ? (
                                            <Check size={14} />
                                        ) : (
                                            <ClipboardCopy size={14} />
                                        )}
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </CopyButton>
                        <Text size="xs" c="dimmed">
                            {labels.copy}
                        </Text>
                    </Group>
                )}
            </Stack>
        ),
        color: 'red',
        withCloseButton: true,
    })
}
