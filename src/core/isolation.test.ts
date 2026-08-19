/// <reference types="node" />
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, type Dirent } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Spec 9's purity rule — `core/` and `ai/` import nothing from `ui/` or
 * `audio/`, touch no DOM or ambient global, and take all randomness from an
 * injected `Rng` — was enforced during the build by a manual grep that did not
 * survive into the repo. The next plan adds `src/ui/**` and Zustand, which is
 * exactly when someone reaches into `core/` for convenience. This test is that
 * grep, made permanent.
 *
 * Reading source off disk is fine here: the purity rule binds `core/` and
 * `ai/`, and a test is neither.
 */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const ROOTS = ['src/core', 'src/ai']

/** The one sanctioned exception, allowed by path rather than by token. */
const SYSTEM_RNG_FILE = 'src/core/rng.ts'

/** Repo-relative paths, so a failure message names the file the way a human would. */
function sourceFiles(dir: string): string[] {
  return readdirSync(join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry: Dirent) => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) return sourceFiles(path)
    if (!entry.name.endsWith('.ts')) return []
    if (entry.name.endsWith('.test.ts')) return []
    return [path]
  })
}

function readSources(): { path: string; text: string }[] {
  return ROOTS.flatMap(sourceFiles).map((path) => ({
    path,
    text: readFileSync(join(REPO_ROOT, path), 'utf-8'),
  }))
}

/** Every module specifier in the file, from static imports/re-exports and dynamic import(). */
function importSpecifiers(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (m[1] !== undefined) out.push(m[1])
  }
  return out
}

/** Lines matching `pattern`, as `path:lineNumber` so a failure names the offender. */
function offendingLines(path: string, text: string, pattern: RegExp): string[] {
  return text
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => pattern.test(line))
    .map(({ n }) => `${path}:${n}`)
}

describe('core and ai stay pure', () => {
  const sources = readSources()

  it('finds the source files it is supposed to be checking', () => {
    // Without this, a wrong path would make every assertion below vacuous.
    expect(sources.length).toBeGreaterThanOrEqual(10)
    const paths = sources.map((s) => s.path)
    for (const expected of ['src/core/game.ts', 'src/core/board.ts', 'src/ai/index.ts', 'src/ai/view.ts']) {
      expect(paths).toContain(expected)
    }
  })

  it('imports nothing from ui/ or audio/', () => {
    for (const { path, text } of sources) {
      for (const specifier of importSpecifiers(text)) {
        const segments = specifier.split('/')
        expect(
          segments.includes('ui') || segments.includes('audio'),
          `${path} imports '${specifier}'`,
        ).toBe(false)
      }
    }
  })

  it('touches no DOM or ambient global', () => {
    // Textual by design, comments included: naming one of these in core/ or ai/
    // is itself a signal. `Date` is matched at its use sites so a prose
    // "Date:" in a header comment does not trip it.
    for (const pattern of [/\bdocument\./, /\bwindow\./, /\bDate\s*\./, /\bnew\s+Date\b/]) {
      for (const { path, text } of sources) {
        expect(offendingLines(path, text, pattern)).toEqual([])
      }
    }
  })

  it('uses Math.random only in the one sanctioned place', () => {
    for (const { path, text } of sources) {
      if (path === SYSTEM_RNG_FILE) continue
      expect(offendingLines(path, text, /\bMath\.random\b/)).toEqual([])
    }
  })

  it('keeps the sanctioned exception to systemRng alone', () => {
    // rng.ts is allowed by path, so pin what that permission actually covers:
    // the doc comment and the systemRng definition, and nothing else.
    const rng = sources.find((s) => s.path === SYSTEM_RNG_FILE)
    expect(rng).toBeDefined()
    const hits = rng!.text.split('\n').filter((line) => /\bMath\.random\b/.test(line))
    expect(hits).toHaveLength(2)
    expect(hits[0]).toContain('The only place Math.random is permitted')
    expect(hits[1]).toContain('export const systemRng')
  })
})
