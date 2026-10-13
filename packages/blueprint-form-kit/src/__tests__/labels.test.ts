import { describe, expect, it } from 'vitest'
import { defaultFormKitLabels, mergeLabels } from '../labels'

// FormKitLabelsProvider passes its `labels` prop through mergeLabels and nothing else, so
// exercising the helper covers the provider without a DOM. What matters is that a null leaf —
// the shape a nullable backend column produces — never reaches the DOM as text.
describe('mergeLabels', () => {
  it('returns the defaults when no labels are given', () => {
    expect(mergeLabels(undefined)).toBe(defaultFormKitLabels)
  })

  it('falls back to the default for null and undefined leaves at both levels', () => {
    const merged = mergeLabels({
      submit: null,
      serverError: undefined,
      validationErrors: 'Fix these',
      unsavedChanges: {
        title: null,
        message: undefined,
        discardButton: 'Discard',
      },
    })

    expect(merged).toEqual({
      ...defaultFormKitLabels,
      validationErrors: 'Fix these',
      unsavedChanges: {
        ...defaultFormKitLabels.unsavedChanges,
        discardButton: 'Discard',
      },
    })
  })

  it('leaves the shared defaults untouched', () => {
    mergeLabels({ unsavedChanges: { discardButton: 'Discard' } })

    expect(defaultFormKitLabels.unsavedChanges.discardButton).toBe(
      'Discard changes',
    )
  })
})

describe('defaultFormKitLabels', () => {
  it('ships a non-empty English default for every leaf', () => {
    const { unsavedChanges, ...flat } = defaultFormKitLabels
    const leaves = [...Object.values(flat), ...Object.values(unsavedChanges)]

    // Eight strings today: four top-level plus the four-key unsavedChanges group.
    expect(leaves).toHaveLength(8)
    for (const leaf of leaves) {
      expect(leaf).toBeTypeOf('string')
      expect(leaf.length).toBeGreaterThan(0)
    }

    expect(defaultFormKitLabels.submit).toBe('Submit')
    expect(defaultFormKitLabels.unsavedChanges.title).toBe('Unsaved changes')
  })
})
