import { expect, test } from 'vitest'
import { DEFAULT_CONFIG, parseDrillConfig } from './config.ts'

test('reads a valid timer', () => expect(parseDrillConfig('{"timerSeconds":60}')).toEqual({ timerSeconds: 60 }))

test.each([undefined, null, '', 'not json', '{"timerSeconds":5}', '{"timerSeconds":500}', '{"timerSeconds":"75"}', 42])(
  'falls back to defaults for %s',
  (value) => expect(parseDrillConfig(value)).toEqual(DEFAULT_CONFIG),
)
