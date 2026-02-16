export function hashNoise2D(x: number, y: number, seed: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 101.3) * 43758.5453123
  return s - Math.floor(s)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function valueNoise2D(x: number, y: number, seed: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = x - x0
  const ty = y - y0

  const n00 = hashNoise2D(x0, y0, seed)
  const n10 = hashNoise2D(x0 + 1, y0, seed)
  const n01 = hashNoise2D(x0, y0 + 1, seed)
  const n11 = hashNoise2D(x0 + 1, y0 + 1, seed)

  const sx = smoothstep(tx)
  const sy = smoothstep(ty)
  const nx0 = lerp(n00, n10, sx)
  const nx1 = lerp(n01, n11, sx)

  return lerp(nx0, nx1, sy)
}

export function fbmNoise2D(x: number, y: number, seed: number, octaves: number) {
  let amplitude = 0.5
  let frequency = 1
  let total = 0
  let norm = 0

  for (let i = 0; i < octaves; i += 1) {
    total += (valueNoise2D(x * frequency, y * frequency, seed + i * 13.17) - 0.5) * 2 * amplitude
    norm += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return norm > 0 ? total / norm : 0
}
