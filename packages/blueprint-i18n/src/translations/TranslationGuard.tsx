import { useEffect, useState } from 'react'
import { Button, Center, Stack, Text, Title } from '@mantine/core'
import { clearTranslationCaches } from './clientHelpers'

const RECOVERY_KEY = 'translation_recovery_attempted'

/**
 * Copy for the guard's own screens.
 *
 * Deliberately a prop rather than a lookup through the translation kit: this component only
 * renders when translations are unusable, so reading its own copy from them would print
 * `undefined` exactly when it matters. An app that wants these localized must source them
 * from something that does not depend on the failed payload — a small bundled dictionary
 * keyed by the browser language, for instance.
 */
export interface TranslationGuardLabels {
    /** Shown while caches are cleared and the page reloads. */
    recovering: string
    /** Heading once a reload has already been attempted and failed. */
    failedTitle: string
    /** Body text on that same screen. */
    failedMessage: string
    /** Label of the manual reload button. */
    reload: string
}

const defaultLabels: TranslationGuardLabels = {
    recovering: 'Loading translations…',
    failedTitle: 'Something went wrong',
    failedMessage: 'An unexpected error occurred. Please reload the page.',
    reload: 'Reload',
}

interface TranslationGuardProps {
    children: React.ReactNode
    translations: unknown
    /**
     * Rendered while the guard clears caches and reloads the page. Takes precedence over
     * `labels.recovering`; pass it when you want a spinner rather than a line of text.
     */
    recoveringFallback?: React.ReactNode
    /**
     * Overrides for the guard's built-in English copy. Omitted keys keep their default, so
     * passing a partial object is fine.
     */
    labels?: Partial<TranslationGuardLabels>
}

function isTranslationsValid(translations: unknown): boolean {
    return (
        translations != null &&
        typeof translations === 'object' &&
        Object.keys(translations).length > 0
    )
}

function hasAttemptedRecovery(): boolean {
    try {
        return sessionStorage.getItem(RECOVERY_KEY) === '1'
    } catch {
        return false
    }
}

function markRecoveryAttempted(): void {
    try {
        sessionStorage.setItem(RECOVERY_KEY, '1')
    } catch {
        // sessionStorage unavailable
    }
}

function clearRecoveryFlag(): void {
    try {
        sessionStorage.removeItem(RECOVERY_KEY)
    } catch {
        // sessionStorage unavailable
    }
}

/**
 * Proactively validates that translations are available before rendering
 * children. If translations are empty (e.g., cookie/localStorage desync),
 * clears caches and reloads once. If recovery already failed, shows an
 * error UI with a reload button.
 */
export function TranslationGuard({
    translations,
    children,
    recoveringFallback,
    labels,
}: TranslationGuardProps) {
    const text = { ...defaultLabels, ...labels }
    const [state, setState] = useState<'valid' | 'recovering' | 'failed'>(
        () => {
            if (typeof window === 'undefined') return 'valid'
            if (isTranslationsValid(translations)) return 'valid'
            return hasAttemptedRecovery() ? 'failed' : 'recovering'
        },
    )

    useEffect(() => {
        if (isTranslationsValid(translations)) {
            clearRecoveryFlag()
            return
        }

        if (hasAttemptedRecovery()) {
            setState('failed')
            return
        }

        console.warn(
            '[translations] Empty translations detected — clearing caches and reloading',
        )
        markRecoveryAttempted()
        clearTranslationCaches()
        window.location.reload()
    }, [translations])

    if (state === 'recovering') {
        return (
            recoveringFallback ?? (
                <Center style={{ minHeight: '100vh' }}>
                    <Text c="dimmed">{text.recovering}</Text>
                </Center>
            )
        )
    }

    if (state === 'failed') {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Stack align="center" gap="md">
                    <Title order={3}>{text.failedTitle}</Title>
                    <Text c="dimmed" ta="center" maw={360}>
                        {text.failedMessage}
                    </Text>
                    <Button onClick={() => window.location.reload()} mt="sm">
                        {text.reload}
                    </Button>
                </Stack>
            </Center>
        )
    }

    return children
}
