import test from 'node:test'
import assert from 'node:assert/strict'

import { PRESETS, createLayerFromPreset } from '../../.tmp-tests/src/spiro/constants.js'

test('createLayerFromPreset keeps preset draw mode', () => {
  const pointPreset = PRESETS.find((preset) => preset.drawMode === 'points')
  assert.ok(pointPreset)

  const layer = createLayerFromPreset(pointPreset, 'layer-1', 'Layer 1')
  assert.equal(layer.drawMode, 'points')
  assert.equal(layer.pointSize, pointPreset.pointSize)
})
