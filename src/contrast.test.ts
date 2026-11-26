// WCAG contrast of the colour tokens in index.css, for every text/background pair the UI uses.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'index.css'), 'utf8')
const token = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`token --${name} not found`)
  return m[1]!
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}

// [foreground, background, minimum ratio] — 4.5 for body text (WCAG AA)
const pairs: [string, string, number][] = [
  ['text', 'bg', 4.5],
  ['text', 'panel', 4.5],
  ['text', 'panel-2', 4.5],
  ['text', 'red-bg', 4.5],
  ['dim', 'bg', 4.5],
  ['dim', 'panel', 4.5],
  ['dim', 'panel-2', 4.5],
  ['dim', 'red-bg', 4.5],
  ['amber', 'bg', 4.5],
  ['amber', 'panel', 4.5],
  ['amber', 'panel-2', 4.5],
  ['on-amber', 'amber', 4.5],
  ['red', 'bg', 4.5],
  ['red', 'panel', 4.5],
  ['red', 'red-bg', 4.5],
  ['green', 'bg', 4.5],
  ['green', 'panel', 4.5],
]

test.each(pairs)('%s on %s meets %s:1', (fg, bg, min) => {
  expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(min)
})
