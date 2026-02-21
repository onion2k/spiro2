import type { ParametricFn } from './types'

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
