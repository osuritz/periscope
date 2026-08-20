/** Installs a matchMedia stub on window for a given viewport. Test-only. */
export function installMatchMedia(width: number, height: number): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const minWidth = /min-width:\s*(\d+)px/.exec(query)
      const maxWidth = /max-width:\s*(\d+)px/.exec(query)
      const orientation = /orientation:\s*(portrait|landscape)/.exec(query)

      let matches = true
      if (minWidth?.[1]) matches &&= width >= Number(minWidth[1])
      if (maxWidth?.[1]) matches &&= width <= Number(maxWidth[1])
      if (orientation?.[1]) {
        matches &&= orientation[1] === (width > height ? 'landscape' : 'portrait')
      }
      return {
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }
    },
  })
}
