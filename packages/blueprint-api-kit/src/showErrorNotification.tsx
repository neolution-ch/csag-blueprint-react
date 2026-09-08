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
import { isProblemDetails, toProblemDetails } from './problemDetailsUtils'

const ERROR_TITLE = 'Something went wrong'

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
    if (problem.traceId) lines.push(`Trace ID: ${problem.traceId}`)
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

    const title = ERROR_TITLE
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

    let messageText: string
    if (detail) {
        messageText = traceId ? `${detail}\nTrace ID: ${traceId}` : detail
    } else {
        messageText = traceId
            ? `Please try again.\nTrace ID: ${traceId}`
            : 'Please try again.'
    }

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
                                    label={
                                        copied ? 'Copied' : 'Copy error details'
                                    }
                                >
                                    <ActionIcon
                                        variant="subtle"
                                        color={copied ? 'teal' : 'gray'}
                                        onClick={copy}
                                        size="sm"
                                        aria-label="Copy error details"
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
                            Copy error details
                        </Text>
                    </Group>
                )}
            </Stack>
        ),
        color: 'red',
        withCloseButton: true,
    })
}
