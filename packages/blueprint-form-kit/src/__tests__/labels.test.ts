import { describe, expect, it } from 'vitest'
import { defaultFormKitLabels } from '../labels'
import type { PartialFormKitLabels } from '../labels'

// The provider merges through the same helper, so exercising the type and the fallback rules
// here keeps this free of a DOM. What matters is that a null leaf — the shape a nullable
// backend column produces — never reaches the DOM as text.
describe('PartialFormKitLabels', () => {
  it('accepts null leaves at both levels', () => {
    const labels: PartialFormKitLabels = {
      submit: null,
      serverError: undefined,
      unsavedChanges: {
        title: null,
        message: undefined,
        discardButton: 'Discard',
      },
    }

    expect(labels.submit).toBeNull()
    expect(labels.unsavedChanges?.discardButton).toBe('Discard')
  })

  it('ships a non-empty English default for every leaf', () => {
    const { unsavedChanges, ...flat } = defaultFormKitLabels
    const leaves = [...Object.values(flat), ...Object.values(unsavedChanges)]

    // Ten strings today: four top-level plus the four-key unsavedChanges group.
    expect(leaves).toHaveLength(8)
    for (const leaf of leaves) {
      expect(leaf).toBeTypeOf('string')
      expect(leaf.length).toBeGreaterThan(0)
    }

    expect(defaultFormKitLabels.submit).toBe('Submit')
    expect(defaultFormKitLabels.unsavedChanges.title).toBe('Unsaved changes')
  })
})
