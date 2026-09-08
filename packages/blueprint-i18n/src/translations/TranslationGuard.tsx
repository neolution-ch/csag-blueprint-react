import { useEffect, useState } from 'react'
import { Button, Center, Stack, Text, Title } from '@mantine/core'
import { clearTranslationCaches } from './clientHelpers'

const RECOVERY_KEY = 'translation_recovery_attempted'

interface TranslationGuardProps {
    children: React.ReactNode
    translations: unknown
    /**
     * Rendered while the guard clears caches and reloads the page. Defaults to
     * a plain "Loading translations…" message; apps can pass their own loader
     * (kept as a prop so this package stays free of app imports).
     */
    recoveringFallback?: React.ReactNode
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
}: TranslationGuardProps) {
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
                    <Text c="dimmed">Loading translations…</Text>
                </Center>
            )
        )
    }

    if (state === 'failed') {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Stack align="center" gap="md">
                    <Title order={3}>Something went wrong</Title>
                    <Text c="dimmed" ta="center" maw={360}>
                        An unexpected error occurred. Please reload the page.
                    </Text>
                    <Button onClick={() => window.location.reload()} mt="sm">
                        Reload
                    </Button>
                </Stack>
            </Center>
        )
    }

    return children
}
