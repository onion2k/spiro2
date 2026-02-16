import test from 'node:test'
import assert from 'node:assert/strict'

import { parseCustomPresetPayload, toLayerPresetData } from '../../.tmp-tests/src/spiro/customPresets.js'

test('parseCustomPresetPayload accepts v1 payloads', () => {
  const payload = {
    version: 1,
    presets: [
      {
        id: 'a',
        name: 'Alpha',
        data: {
          exprX: 'sin(t)',
          exprY: 'cos(t)',
          R: 8,
          r: 3,
          d: 6,
          speed: 1.2,
          uSpeed: 0.4,
          lineLifetime: 9,
          lineForever: false,
          drawMode: 'lines',
          pointSize: 2,
          colorMode: 'hue-cycle',
          paletteId: 'neon',
          hueLock: false,
          baseHue: 210,
        },
      },
    ],
  }

  const parsed = parseCustomPresetPayload(payload)
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].name, 'Alpha')
  assert.equal(parsed[0].data.exprX, 'sin(t)')
})

test('parseCustomPresetPayload migrates array payloads', () => {
  const payload = [
    {
      id: 'b',
      name: 'Beta',
      data: {
        exprX: 't',
        exprY: 'u',
      },
    },
  ]

  const parsed = parseCustomPresetPayload(payload)
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].id, 'b')
  assert.equal(parsed[0].data.drawMode, 'lines')
})

test('toLayerPresetData strips id/name/visible', () => {
  const layer = {
    id: 'layer-1',
    name: 'Layer 1',
    visible: true,
    exprX: 'x',
    exprY: 'y',
    R: 1,
    r: 2,
    d: 3,
    speed: 4,
    uSpeed: 5,
    lineLifetime: 6,
    lineForever: true,
    drawMode: 'points',
    pointSize: 2.2,
    colorMode: 'palette',
    paletteId: 'ocean',
    hueLock: true,
    baseHue: 120,
  }

  const data = toLayerPresetData(layer)
  assert.equal('id' in data, false)
  assert.equal('name' in data, false)
  assert.equal('visible' in data, false)
  assert.equal(data.paletteId, 'ocean')
})
