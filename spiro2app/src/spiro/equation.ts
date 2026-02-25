import type { LayerConfig, ParametricFn, PathGenerator } from './types'

export function compileParametric(exprX: string, exprY: string, exprZ: string): { fn: ParametricFn | null; error: string } {
  try {
    const compiled = new Function(
      't',
      'u',
      'R',
      'r',
      'd',
      '"use strict"; const {sin,cos,tan,abs,sqrt,pow,PI,E,log,exp,min,max,atan2,sign,floor} = Math; const clamp=(v,lo,hi)=>min(max(v,lo),hi); const mix=(a,b,p)=>a+(b-a)*p; const saw=(v)=>2*(v/(2*PI)-floor(v/(2*PI)+0.5)); const triangle=(v)=>2*abs(saw(v))-1; const pulse=(v,w)=>abs(saw(v))<w?1:0; return { x: ' + exprX + ', y: ' + exprY + ', z: ' + exprZ + ' };'
    ) as ParametricFn

    const test = compiled(0, 0, 5, 3, 5)
    if (!Number.isFinite(test.x) || !Number.isFinite(test.y) || !Number.isFinite(test.z)) {
      return { fn: null, error: 'Equations must produce finite x, y, and z values.' }
    }

    return { fn: compiled, error: '' }
  } catch (error) {
    if (error instanceof Error) {
      return { fn: null, error: `Equation error: ${error.message}` }
    }
    return { fn: null, error: 'Invalid parametric equation syntax.' }
  }
}

export function compileParametricGenerator(
  exprX: string,
  exprY: string,
  exprZ: string
): { generator: PathGenerator | null; error: string } {
  const { fn, error } = compileParametric(exprX, exprY, exprZ)
  if (!fn) {
    return { generator: null, error }
  }

  const generator: PathGenerator = {
    kind: 'parametric',
    createState: () => ({ t: 0, u: 0 }),
    step: ({ layer, dt, state, modulatePhase }) => {
      const baseT = (Number.isFinite(state.t) ? state.t : 0) + dt * layer.speed
      const baseU = (Number.isFinite(state.u) ? state.u : 0) + dt * layer.uSpeed
      state.t = baseT
      state.u = baseU

      const sample = modulatePhase({ t: baseT, u: baseU })
      const point = fn(sample.t, sample.u, layer.R, layer.r, layer.d)
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
        return null
      }

      return {
        point,
        phase: {
          base: { t: baseT, u: baseU },
          sample,
        },
      }
    },
  }

  return { generator, error: '' }
}

export function compileLissajousGenerator(layer: LayerConfig): { generator: PathGenerator; error: string } {
  const generator: PathGenerator = {
    kind: 'lissajous',
    createState: () => ({ t: 0, u: 0 }),
    step: ({ dt, state, modulatePhase }) => {
      const baseT = (Number.isFinite(state.t) ? state.t : 0) + dt * layer.speed
      const baseU = (Number.isFinite(state.u) ? state.u : 0) + dt * layer.uSpeed
      state.t = baseT
      state.u = baseU
      const sample = modulatePhase({ t: baseT, u: baseU })
      const point = {
        x: layer.lissajousAx * Math.sin(layer.lissajousFx * sample.t + layer.lissajousPhaseX + layer.lissajousUMixX * sample.u),
        y: layer.lissajousAy * Math.sin(layer.lissajousFy * sample.t + layer.lissajousPhaseY + layer.lissajousUMixY * sample.u),
        z: layer.lissajousAz * Math.sin(layer.lissajousFz * sample.t + layer.lissajousPhaseZ + layer.lissajousUMixZ * sample.u),
      }
      return {
        point,
        phase: {
          base: { t: baseT, u: baseU },
          sample,
        },
      }
    },
  }
  return { generator, error: '' }
}

export function compileStrangeAttractorGenerator(layer: LayerConfig): { generator: PathGenerator; error: string } {
  const generator: PathGenerator = {
    kind: 'strange-attractor',
    createState: () => ({
      t: 0,
      u: 0,
      x: layer.attractorInitialX,
      y: layer.attractorInitialY,
      z: layer.attractorInitialZ,
      warmed: 0,
    }),
    step: ({ dt, state, modulatePhase }) => {
      const baseT = (Number.isFinite(state.t) ? state.t : 0) + dt * layer.speed
      const baseU = (Number.isFinite(state.u) ? state.u : 0) + dt * layer.uSpeed
      state.t = baseT
      state.u = baseU
      const sample = modulatePhase({ t: baseT, u: baseU })

      const sigma = layer.attractorSigma
      const rho = layer.attractorRho
      const beta = layer.attractorBeta
      const stepScale = Math.max(0.01, layer.attractorStepScale)
      const integrationStep = dt > 0 ? dt * stepScale : (1 / 60) * stepScale
      const subSteps = Math.max(1, Math.min(20, Math.ceil(Math.abs(integrationStep) / 0.01)))
      const h = integrationStep / subSteps

      let x = Number.isFinite(state.x) ? state.x : layer.attractorInitialX
      let y = Number.isFinite(state.y) ? state.y : layer.attractorInitialY
      let z = Number.isFinite(state.z) ? state.z : layer.attractorInitialZ

      const warmupTarget = Math.max(0, Math.round(layer.attractorWarmupSteps))
      const warmupRemaining = Math.max(0, warmupTarget - Math.round(Number.isFinite(state.warmed) ? state.warmed : 0))
      const totalSteps = subSteps + warmupRemaining
      for (let i = 0; i < totalSteps; i += 1) {
        let dx = 0
        let dy = 0
        let dz = 0
        if (layer.attractorEquation === 'rossler') {
          dx = -y - z
          dy = x + sigma * y
          dz = beta + z * (x - rho)
        } else if (layer.attractorEquation === 'chen') {
          dx = sigma * (y - x)
          dy = (rho - sigma) * x - x * z + rho * y
          dz = x * y - beta * z
        } else if (layer.attractorEquation === 'thomas') {
          const b = Math.max(0.01, beta * 0.1)
          dx = Math.sin(y) - b * x
          dy = Math.sin(z) - b * y
          dz = Math.sin(x) - b * z
        } else if (layer.attractorEquation === 'halvorsen') {
          const a = 1 + Math.max(0, sigma) * 0.1
          dx = -a * x - 4 * y - 4 * z - y * y
          dy = -a * y - 4 * z - 4 * x - z * z
          dz = -a * z - 4 * x - 4 * y - x * x
        } else if (layer.attractorEquation === 'aizawa') {
          const a = 0.95
          const b = 0.7
          const c = 0.6 + Math.max(0, rho) * 0.01
          const d = 3.5
          const e = 0.25 + Math.max(0, beta) * 0.01
          const f = 0.1 + Math.max(0, sigma) * 0.005
          dx = (z - b) * x - d * y
          dy = d * x + (z - b) * y
          dz = c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x
        } else if (layer.attractorEquation === 'lu-chen') {
          dx = sigma * (y - x)
          dy = -x * z + rho * y
          dz = x * y - beta * z
        } else if (layer.attractorEquation === 'rabinovich-fabrikant') {
          const alpha = 0.14 + Math.max(0, rho) * 0.01
          const gamma = 0.1 + Math.max(0, beta) * 0.01
          dx = y * (z - 1 + x * x) + gamma * x
          dy = x * (3 * z + 1 - x * x) + gamma * y
          dz = -2 * z * (alpha + x * y)
        } else {
          dx = sigma * (y - x)
          dy = x * (rho - z) - y
          dz = x * y - beta * z
        }
        x += dx * h
        y += dy * h
        z += dz * h
      }
      state.warmed = warmupTarget
      state.x = x
      state.y = y
      state.z = z

      const uInfluence = 1 + 0.08 * Math.sin(sample.u)
      return {
        point: {
          x: x * layer.attractorScale * uInfluence,
          y: y * layer.attractorScale * uInfluence,
          z: z * layer.attractorScale,
        },
        phase: {
          base: { t: baseT, u: baseU },
          sample,
        },
      }
    },
  }
  return { generator, error: '' }
}

export function compileLayerGenerator(layer: LayerConfig): { generator: PathGenerator | null; error: string } {
  if (layer.generatorKind === 'lissajous') {
    return compileLissajousGenerator(layer)
  }
  if (layer.generatorKind === 'strange-attractor') {
    return compileStrangeAttractorGenerator(layer)
  }
  return compileParametricGenerator(layer.exprX, layer.exprY, layer.exprZ)
}
