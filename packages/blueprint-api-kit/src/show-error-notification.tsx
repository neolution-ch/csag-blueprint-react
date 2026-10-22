import { notifications } from '@mantine/notifications'
import {
    ActionIcon,
    CopyButton,
    Group,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core'
import { ClipboardCopy, Check } from 'lucide-react'
import {
    defaultErrorNotificationLabels,
    describeErrorNotification,
} from './error-notification-content'
import type { ErrorNotificationLabels } from './error-notification-content'

let labels: ErrorNotificationLabels = defaultErrorNotificationLabels

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
        labels = defaultErrorNotificationLabels
        return
    }

    const merged = { ...defaultErrorNotificationLabels }
    for (const [key, value] of Object.entries(next)) {
        if (typeof value === 'string' && value.length > 0) {
            merged[key as keyof ErrorNotificationLabels] = value
        }
    }
    labels = merged
}

/**
 * Show a rich error notification for API errors.
 *
 * Errors from Orval-generated hooks are already ProblemDetails (transformed
 * by the mutator). Errors from direct axios calls are still AxiosErrors.
 * This function handles both, but the primary path is ProblemDetails.
 *
 * A 4xx is titled with `rejectedTitle`, anything else with `title`. The body is the
 * server's `detail`, else the reasons in its `errors`, else its `title`.
 */
export function showErrorNotification(error: unknown) {
    // Non-browser guard (e.g. unit tests) — Mantine notifications require the DOM.
    if (typeof window === 'undefined') return

    // Captured once so that a language change while the toast is open cannot mix languages:
    // the CopyButton render prop below runs again on every copy, long after this call returns.
    const text = labels

    const {
        title,
        message: messageText,
        clipboardText,
    } = describeErrorNotification(error, text)

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
                                    label={copied ? text.copied : text.copy}
                                >
                                    <ActionIcon
                                        variant="subtle"
                                        color={copied ? 'teal' : 'gray'}
                                        onClick={copy}
                                        size="sm"
                                        aria-label={text.copy}
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
                            {text.copy}
                        </Text>
                    </Group>
                )}
            </Stack>
        ),
        color: 'red',
        withCloseButton: true,
    })
}
