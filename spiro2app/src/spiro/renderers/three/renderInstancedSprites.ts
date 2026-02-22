import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  type PlaneGeometry,
  type Texture,
} from 'three'

import {
  buildLineOffsets,
  buildSymmetryVariants3D,
  colorForPoint,
  lineWidthForPoint,
  tangentForTrail,
  type RuntimeLayer,
} from '../runtime'
import type { StrokeWidthMode } from '../../types'

const MAX_SPRITE_COUNT = 20000
const INITIAL_CAPACITY = 1024

type SpriteBatchUserData = {
  skipGeometryDispose: true
  skipMaterialDispose: true
  spriteInstanceCount: number
  capacity: number
  offsetAttr: InstancedBufferAttribute
  sizeAttr: InstancedBufferAttribute
  colorAttr: InstancedBufferAttribute
}

export type SpriteBatchMesh = Mesh<InstancedBufferGeometry, ShaderMaterial> & {
  userData: SpriteBatchUserData
}

type RenderInstancedSpritesOptions = {
  runtimeLayer: RuntimeLayer
  center: { x: number; y: number }
  nowSec: number
  width: number
  height: number
  step: number
  camera: unknown
  spriteGeometry: PlaneGeometry | null
  spriteTexture: Texture
  spriteSizeScale: number
  spriteSoftness: number
  mirrorX: boolean
  mirrorY: boolean
  rotationalRepeats: number
  rotationOffsetDeg: number
  strokeWidthMode: StrokeWidthMode
  baseLineWidth: number
  lineWidthBoost: number
  trailSmoothing: number
  dashedLines: boolean
  dashLength: number
  dashGap: number
  existingMesh?: SpriteBatchMesh
}

function smoothTrailPoint(trail: RuntimeLayer['trail'], index: number, amount: number) {
  const current = trail[index]
  if (!current || amount <= 0 || !current.connected) {
    return current
  }
  const previous = trail[Math.max(0, index - 1)]
  const next = trail[Math.min(trail.length - 1, index + 1)]
  if (!previous || !next || !previous.connected || !next.connected) {
    return current
  }
  const clamped = Math.max(0, Math.min(1, amount))
  const neighborWeight = Math.min(0.45, clamped * 0.45)
  const selfWeight = 1 - neighborWeight * 2
  return {
    ...current,
    x: current.x * selfWeight + (previous.x + next.x) * neighborWeight,
    y: current.y * selfWeight + (previous.y + next.y) * neighborWeight,
    z: current.z * selfWeight + (previous.z + next.z) * neighborWeight,
  }
}

function buildSmoothedTrail(trail: RuntimeLayer['trail'], amount: number) {
  if (amount <= 0 || trail.length < 3) {
    return trail
  }
  const clamped = Math.max(0, Math.min(1, amount))
  const passes = Math.max(1, Math.min(10, Math.round(clamped * 10)))
  let output = trail.map((point) => ({ ...point }))
  for (let pass = 0; pass < passes; pass += 1) {
    output = output.map((_, index) => smoothTrailPoint(output, index, clamped) ?? output[index])
  }
  return output
}

function clampSpriteSoftness(value: number) {
  return Math.max(0, Math.min(1, value))
}

function createSpriteGeometry(capacity: number) {
  const geometry = new InstancedBufferGeometry()
  geometry.setIndex([0, 1, 2, 2, 1, 3])
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]), 3)
  )
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2))

  const offsetAttr = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3)
  const sizeAttr = new InstancedBufferAttribute(new Float32Array(capacity), 1)
  const colorAttr = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3)
  offsetAttr.setUsage(DynamicDrawUsage)
  sizeAttr.setUsage(DynamicDrawUsage)
  colorAttr.setUsage(DynamicDrawUsage)

  geometry.setAttribute('instanceOffset', offsetAttr)
  geometry.setAttribute('instanceSize', sizeAttr)
  geometry.setAttribute('instanceColor', colorAttr)
  geometry.instanceCount = 0

  return { geometry, offsetAttr, sizeAttr, colorAttr }
}

function createSpriteMaterial(texture: Texture, width: number, height: number, softness: number) {
  return new ShaderMaterial({
    uniforms: {
      map: { value: texture },
      opacity: { value: 0.9 },
      resolution: { value: { x: Math.max(1, width), y: Math.max(1, height) } },
      softness: { value: clampSpriteSoftness(softness) },
    },
    vertexShader: `
      attribute vec3 instanceOffset;
      attribute float instanceSize;
      attribute vec3 instanceColor;
      varying vec2 vUv;
      varying vec3 vColor;
      uniform vec2 resolution;

      void main() {
        vUv = uv;
        vColor = instanceColor;
        vec4 centerView = modelViewMatrix * vec4(instanceOffset, 1.0);
        vec4 clipPosition = projectionMatrix * centerView;
        vec2 ndcOffset = position.xy * instanceSize * 2.0 / resolution;
        clipPosition.xy += ndcOffset * clipPosition.w;
        gl_Position = clipPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float softness;
      varying vec2 vUv;
      varying vec3 vColor;

      void main() {
        vec4 tex = texture2D(map, vUv);
        float easedAlpha = pow(tex.a, mix(2.2, 0.65, clamp(softness, 0.0, 1.0)));
        float alpha = easedAlpha * opacity;
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(vColor * tex.rgb, alpha);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    toneMapped: false,
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
  })
}

function createSpriteMesh(texture: Texture, width: number, height: number, softness: number): SpriteBatchMesh {
  const { geometry, offsetAttr, sizeAttr, colorAttr } = createSpriteGeometry(INITIAL_CAPACITY)
  const material = createSpriteMaterial(texture, width, height, softness)
  const mesh = new Mesh(geometry, material) as SpriteBatchMesh
  mesh.frustumCulled = false
  mesh.userData = {
    skipGeometryDispose: true,
    skipMaterialDispose: true,
    spriteInstanceCount: 0,
    capacity: INITIAL_CAPACITY,
    offsetAttr,
    sizeAttr,
    colorAttr,
  }
  return mesh
}

function ensureCapacity(mesh: SpriteBatchMesh, requiredCount: number) {
  if (requiredCount <= mesh.userData.capacity) {
    return
  }
  let nextCapacity = mesh.userData.capacity
  while (nextCapacity < requiredCount) {
    nextCapacity = Math.min(MAX_SPRITE_COUNT, nextCapacity * 2)
    if (nextCapacity === MAX_SPRITE_COUNT) {
      break
    }
  }
  if (nextCapacity <= mesh.userData.capacity) {
    return
  }
  const geometry = mesh.geometry
  const oldOffsetAttr = mesh.userData.offsetAttr
  const oldSizeAttr = mesh.userData.sizeAttr
  const oldColorAttr = mesh.userData.colorAttr

  const offsetAttr = new InstancedBufferAttribute(new Float32Array(nextCapacity * 3), 3)
  const sizeAttr = new InstancedBufferAttribute(new Float32Array(nextCapacity), 1)
  const colorAttr = new InstancedBufferAttribute(new Float32Array(nextCapacity * 3), 3)
  offsetAttr.setUsage(DynamicDrawUsage)
  sizeAttr.setUsage(DynamicDrawUsage)
  colorAttr.setUsage(DynamicDrawUsage)

  offsetAttr.array.set(oldOffsetAttr.array)
  sizeAttr.array.set(oldSizeAttr.array)
  colorAttr.array.set(oldColorAttr.array)

  geometry.setAttribute('instanceOffset', offsetAttr)
  geometry.setAttribute('instanceSize', sizeAttr)
  geometry.setAttribute('instanceColor', colorAttr)

  mesh.userData.capacity = nextCapacity
  mesh.userData.offsetAttr = offsetAttr
  mesh.userData.sizeAttr = sizeAttr
  mesh.userData.colorAttr = colorAttr
}

function updateMaterialUniforms(mesh: SpriteBatchMesh, texture: Texture, width: number, height: number, softness: number) {
  mesh.material.uniforms.map.value = texture
  mesh.material.uniforms.resolution.value.x = Math.max(1, width)
  mesh.material.uniforms.resolution.value.y = Math.max(1, height)
  mesh.material.uniforms.softness.value = clampSpriteSoftness(softness)
}

export function disposeSpriteBatchMesh(mesh: SpriteBatchMesh) {
  mesh.geometry.dispose()
  mesh.material.dispose()
}

export function renderInstancedSprites(options: RenderInstancedSpritesOptions): SpriteBatchMesh | null {
  const {
    runtimeLayer,
    center,
    nowSec,
    width,
    height,
    step,
    camera,
    spriteGeometry,
    spriteTexture,
    spriteSizeScale,
    spriteSoftness,
    mirrorX,
    mirrorY,
    rotationalRepeats,
    rotationOffsetDeg,
    strokeWidthMode,
    baseLineWidth,
    lineWidthBoost,
    trailSmoothing,
    dashedLines,
    dashLength,
    dashGap,
    existingMesh,
  } = options
  void camera
  void spriteGeometry

  const layer = runtimeLayer.layer
  const spritePositions: number[] = []
  const spriteSizes: number[] = []
  const spriteColors: Color[] = []
  const dashCycle = Math.max(1, dashLength + dashGap)
  const sizeScale = Math.max(0.1, spriteSizeScale)
  const smoothedTrail = buildSmoothedTrail(runtimeLayer.trail, trailSmoothing)

  for (let i = Math.max(step, 1); i < smoothedTrail.length; i += step) {
    const current = smoothedTrail[i]
    if (!current) {
      continue
    }
    if (!current.connected) {
      continue
    }
    if (dashedLines) {
      const phase = ((current.index % dashCycle) + dashCycle) % dashCycle
      if (phase > dashLength) {
        continue
      }
    }
    const tangent = tangentForTrail(smoothedTrail, i, step)
    const pointOffsets = buildLineOffsets(layer, current.index, runtimeLayer.paramU, tangent)
    const style = colorForPoint(current, layer, nowSec)
    const rgb = new Color(`hsl(${style.hue}, 90%, 70%)`)
    const spriteSize = Math.max(
      1.8,
      lineWidthForPoint(current, strokeWidthMode, baseLineWidth, lineWidthBoost) * 2 * sizeScale
    )

    for (const offset of pointOffsets) {
      const copies = buildSymmetryVariants3D(
        { x: current.x + offset.x, y: current.y + offset.y, z: current.z + offset.z },
        { x: center.x, y: center.y, z: 0 },
        mirrorX,
        mirrorY,
        rotationalRepeats,
        rotationOffsetDeg
      )
      for (const copy of copies) {
        spritePositions.push(copy.x - center.x, center.y - copy.y, copy.z)
        spriteSizes.push(spriteSize)
        spriteColors.push(rgb)
      }
    }
  }

  if (spritePositions.length === 0) {
    if (existingMesh) {
      existingMesh.geometry.instanceCount = 0
      existingMesh.userData.spriteInstanceCount = 0
    }
    return null
  }

  const spriteCount = Math.min(MAX_SPRITE_COUNT, Math.floor(spritePositions.length / 3))
  const mesh = existingMesh ?? createSpriteMesh(spriteTexture, width, height, spriteSoftness)
  ensureCapacity(mesh, spriteCount)
  updateMaterialUniforms(mesh, spriteTexture, width, height, spriteSoftness)

  const offsetArray = mesh.userData.offsetAttr.array as Float32Array
  const sizeArray = mesh.userData.sizeAttr.array as Float32Array
  const colorArray = mesh.userData.colorAttr.array as Float32Array

  for (let i = 0; i < spriteCount; i += 1) {
    const p = i * 3
    offsetArray[p] = spritePositions[p]
    offsetArray[p + 1] = spritePositions[p + 1]
    offsetArray[p + 2] = spritePositions[p + 2]
    sizeArray[i] = spriteSizes[i]
    colorArray[p] = spriteColors[i].r
    colorArray[p + 1] = spriteColors[i].g
    colorArray[p + 2] = spriteColors[i].b
  }

  mesh.userData.offsetAttr.needsUpdate = true
  mesh.userData.sizeAttr.needsUpdate = true
  mesh.userData.colorAttr.needsUpdate = true
  mesh.geometry.instanceCount = spriteCount
  mesh.userData.spriteInstanceCount = spriteCount
  return mesh
}
