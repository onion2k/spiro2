import test from 'node:test'
import assert from 'node:assert/strict'

import { PRESETS, createLayerFromPreset } from '../../.tmp-tests/src/spiro/constants.js'

test('createLayerFromPreset keeps key preset values', () => {
  const preset = PRESETS[0]
  assert.ok(preset)

  const layer = createLayerFromPreset(preset, 'layer-1', 'Layer 1')
  assert.equal(layer.pointSize, preset.pointSize)
  assert.equal(layer.exprZ, preset.exprZ ?? '0')
})
