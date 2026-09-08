import { createContext, use, useMemo } from 'react'
import type { ReactNode } from 'react'

/** Every user-visible string the form kit renders on the consumer's behalf. */
export interface FormKitLabels {
    /** Text of `<form.SubmitButton />` when no children are given. */
    submit: string
    /** Title of the form-level `<form.ServerErrorAlert />` banner. */
    serverError: string
    /** Title of the `<form.OrphanFieldErrors />` banner. */
    validationErrors: string
    /** aria-label for the PasswordInput visibility toggle. */
    togglePasswordVisibility: string
    /** Copy for the confirmation modal shown by `guardUnsavedChanges`. */
    unsavedChanges: {
        title: string
        message: string
        discardButton: string
        stayButton: string
    }
}

export const defaultFormKitLabels: FormKitLabels = {
    submit: 'Submit',
    serverError: 'Server error',
    validationErrors: 'Validation errors',
    togglePasswordVisibility: 'Toggle password visibility',
    unsavedChanges: {
        title: 'Unsaved changes',
        message: 'You have unsaved changes. Leave without saving?',
        discardButton: 'Discard changes',
        stayButton: 'Keep editing',
    },
}

export type PartialFormKitLabels = {
    [K in keyof FormKitLabels]?: FormKitLabels[K] extends string
        ? string | undefined
        : Partial<FormKitLabels[K]>
}

/**
 * Merge one level deep, treating an explicit `undefined` — not just a missing key — as
 * "fall back to the default". Translations are fetched from the API, so a key is
 * legitimately undefined while they load, and without this the string "undefined" would
 * reach the DOM.
 */
function mergeLabels(partial: PartialFormKitLabels | undefined): FormKitLabels {
    if (!partial) return defaultFormKitLabels

    const unsavedChanges = { ...defaultFormKitLabels.unsavedChanges }
    for (const [key, value] of Object.entries(partial.unsavedChanges ?? {})) {
        if (typeof value === 'string') {
            unsavedChanges[key as keyof FormKitLabels['unsavedChanges']] = value
        }
    }

    return {
        submit: partial.submit ?? defaultFormKitLabels.submit,
        serverError: partial.serverError ?? defaultFormKitLabels.serverError,
        validationErrors:
            partial.validationErrors ?? defaultFormKitLabels.validationErrors,
        togglePasswordVisibility:
            partial.togglePasswordVisibility ??
            defaultFormKitLabels.togglePasswordVisibility,
        unsavedChanges,
    }
}

const FormKitLabelsContext = createContext<FormKitLabels | undefined>(undefined)

/**
 * Supplies the form kit's user-visible strings. Optional: without it the kit renders the
 * English defaults, which is also what keeps it usable before an app's translations have
 * loaded.
 */
export function FormKitLabelsProvider({
    labels,
    children,
}: {
    labels?: PartialFormKitLabels
    children: ReactNode
}) {
    const value = useMemo(() => mergeLabels(labels), [labels])
    return <FormKitLabelsContext value={value}>{children}</FormKitLabelsContext>
}

/** Never throws — no provider means the English defaults. */
export function useFormKitLabels(): FormKitLabels {
    return use(FormKitLabelsContext) ?? defaultFormKitLabels
}
