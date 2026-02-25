import test from 'node:test'
import assert from 'node:assert/strict'

import { compileLayerGenerator, compileParametricGenerator } from '../../.tmp-tests/src/spiro/equation.js'

test('compileParametricGenerator returns a working parametric generator', () => {
  const { generator, error } = compileParametricGenerator('R + t + u', 'r + t - u', 'd + t * 2')
  assert.equal(error, '')
  assert.ok(generator)

  const state = generator.createState?.() ?? {}
  const first = generator.step({
    layer: { R: 10, r: 3, d: 5, speed: 2, uSpeed: 4 },
    dt: 0.5,
    state,
    modulatePhase: ({ t, u }) => ({ t: t + 1, u: u - 2 }),
  })

  assert.ok(first)
  assert.equal(first.phase.base.t, 1)
  assert.equal(first.phase.base.u, 2)
  assert.equal(first.phase.sample.t, 2)
  assert.equal(first.phase.sample.u, 0)
  assert.equal(first.point.x, 12)
  assert.equal(first.point.y, 5)
  assert.equal(first.point.z, 9)
})

test('compileParametricGenerator returns null generator for invalid equation', () => {
  const { generator, error } = compileParametricGenerator('R +', 'r', 'd')
  assert.equal(generator, null)
  assert.match(error, /Equation error|Invalid parametric equation syntax/)
})

test('compileLayerGenerator builds lissajous generator', () => {
  const layer = {
    exprX: '0',
    exprY: '0',
    exprZ: '0',
    generatorKind: 'lissajous',
    lissajousAx: 10,
    lissajousAy: 8,
    lissajousAz: 6,
    lissajousFx: 3,
    lissajousFy: 2,
    lissajousFz: 5,
    lissajousPhaseX: 0,
    lissajousPhaseY: 0,
    lissajousPhaseZ: 0,
    lissajousUMixX: 0,
    lissajousUMixY: 0,
    lissajousUMixZ: 0,
    attractorEquation: 'lorenz',
    R: 10,
    r: 8,
    d: 6,
    speed: 1,
    uSpeed: 0,
  }
  const { generator, error } = compileLayerGenerator(layer)
  assert.equal(error, '')
  assert.ok(generator)
  assert.equal(generator.kind, 'lissajous')

  const state = generator.createState?.() ?? {}
  const sample = generator.step({
    layer,
    dt: Math.PI / 2,
    state,
    modulatePhase: ({ t, u }) => ({ t, u }),
  })
  assert.ok(sample)
  assert.equal(Math.round(sample.point.x), -10)
  assert.equal(Math.round(sample.point.y), 0)
  assert.equal(Math.round(sample.point.z), 6)
})

test('compileLayerGenerator builds strange-attractor generator', () => {
  const layer = {
    exprX: '0',
    exprY: '0',
    exprZ: '0',
    generatorKind: 'strange-attractor',
    lissajousAx: 1,
    lissajousAy: 1,
    lissajousAz: 1,
    lissajousFx: 1,
    lissajousFy: 1,
    lissajousFz: 1,
    lissajousPhaseX: 0,
    lissajousPhaseY: 0,
    lissajousPhaseZ: 0,
    lissajousUMixX: 0,
    lissajousUMixY: 0,
    lissajousUMixZ: 0,
    attractorSigma: 10,
    attractorRho: 28,
    attractorBeta: 8 / 3,
    attractorStepScale: 1,
    attractorInitialX: 0.1,
    attractorInitialY: 0,
    attractorInitialZ: 0,
    attractorScale: 0.35,
    attractorWarmupSteps: 12,
    attractorEquation: 'lorenz',
    R: 12,
    r: 12,
    d: 12,
    speed: 1,
    uSpeed: 0.2,
  }
  const { generator, error } = compileLayerGenerator(layer)
  assert.equal(error, '')
  assert.ok(generator)
  assert.equal(generator.kind, 'strange-attractor')

  const state = generator.createState?.() ?? {}
  const sample = generator.step({
    layer,
    dt: 0.016,
    state,
    modulatePhase: ({ t, u }) => ({ t, u }),
  })
  assert.ok(sample)
  assert.ok(Number.isFinite(sample.point.x))
  assert.ok(Number.isFinite(sample.point.y))
  assert.ok(Number.isFinite(sample.point.z))
})

test('strange-attractor supports multiple equation families', () => {
  const base = {
    exprX: '0',
    exprY: '0',
    exprZ: '0',
    generatorKind: 'strange-attractor',
    lissajousAx: 1,
    lissajousAy: 1,
    lissajousAz: 1,
    lissajousFx: 1,
    lissajousFy: 1,
    lissajousFz: 1,
    lissajousPhaseX: 0,
    lissajousPhaseY: 0,
    lissajousPhaseZ: 0,
    lissajousUMixX: 0,
    lissajousUMixY: 0,
    lissajousUMixZ: 0,
    attractorSigma: 10,
    attractorRho: 28,
    attractorBeta: 8 / 3,
    attractorStepScale: 1,
    attractorInitialX: 0.1,
    attractorInitialY: 0,
    attractorInitialZ: 0,
    attractorScale: 0.35,
    attractorWarmupSteps: 8,
    R: 12,
    r: 12,
    d: 12,
    speed: 1,
    uSpeed: 0.2,
  }

  for (const equation of ['lorenz', 'rossler', 'chen', 'thomas', 'halvorsen', 'aizawa', 'lu-chen', 'rabinovich-fabrikant']) {
    const layer = { ...base, attractorEquation: equation }
    const { generator, error } = compileLayerGenerator(layer)
    assert.equal(error, '')
    assert.ok(generator)
    const state = generator.createState?.() ?? {}
    const sample = generator.step({
      layer,
      dt: 0.016,
      state,
      modulatePhase: ({ t, u }) => ({ t, u }),
    })
    assert.ok(sample)
    assert.ok(Number.isFinite(sample.point.x))
    assert.ok(Number.isFinite(sample.point.y))
    assert.ok(Number.isFinite(sample.point.z))
  }
})
