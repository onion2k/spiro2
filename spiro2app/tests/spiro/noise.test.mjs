import test from 'node:test'
import assert from 'node:assert/strict'

import { hashNoise2D, fbmNoise2D } from '../../.tmp-tests/src/spiro/noise.js'

test('hashNoise2D is deterministic', () => {
  const a = hashNoise2D(1.23, 4.56, 7.89)
  const b = hashNoise2D(1.23, 4.56, 7.89)
  assert.equal(a, b)
})

test('hashNoise2D output is in [0, 1)', () => {
  for (let i = 0; i < 100; i += 1) {
    const n = hashNoise2D(i * 0.13, i * 0.29, 3.7)
    assert.ok(n >= 0)
    assert.ok(n < 1)
  }
})

test('fbmNoise2D is stable and bounded', () => {
  const values = []
  for (let i = 0; i < 64; i += 1) {
    values.push(fbmNoise2D(i * 0.11, i * 0.07, 2.5, 4))
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  assert.ok(Number.isFinite(max))
  assert.ok(Number.isFinite(min))
  assert.ok(max <= 1.2)
  assert.ok(min >= -1.2)
})
