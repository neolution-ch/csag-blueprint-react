import { afterEach, describe, expect, it, vi } from 'vitest'

// The zone cache attaches its listeners once per module, on the first read, so each case loads
// a fresh copy of the module after stubbing the globals.
async function freshViewerTimeZone() {
  vi.resetModules()
  const zones = await import('../zones')
  return zones.viewerTimeZone
}

describe('viewerTimeZone outside a browser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the zone where there is no window at all', async () => {
    const viewerTimeZone = await freshViewerTimeZone()
    expect(() => viewerTimeZone()).not.toThrow()
  })

  it('reads the zone where window has no addEventListener (React Native)', async () => {
    vi.stubGlobal('window', {})
    const viewerTimeZone = await freshViewerTimeZone()
    expect(viewerTimeZone()).toBe(
      new Intl.DateTimeFormat().resolvedOptions().timeZone,
    )
  })

  it('listens on window alone where there is no document (Deno 1.x)', async () => {
    const addEventListener = vi.fn()
    vi.stubGlobal('window', { addEventListener })
    const viewerTimeZone = await freshViewerTimeZone()
    viewerTimeZone()
    expect(addEventListener).toHaveBeenCalledWith('focus', expect.any(Function))
  })
})
