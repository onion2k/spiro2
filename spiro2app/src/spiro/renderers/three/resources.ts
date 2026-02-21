import type { Group, Object3D } from 'three'
import { CanvasTexture } from 'three'

export function createGlowSpriteTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const cx = canvas.width * 0.5
    const cy = canvas.height * 0.5
    const radius = canvas.width * 0.5
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.34, 'rgba(255,255,255,0.95)')
    grad.addColorStop(0.62, 'rgba(180,220,255,0.35)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function disposeRenderableObject(node: Object3D) {
  const renderObject = node as {
    geometry?: { dispose: () => void }
    material?: { dispose: () => void } | Array<{ dispose: () => void }>
    userData?: { skipGeometryDispose?: boolean; skipMaterialDispose?: boolean }
  }
  if (renderObject.geometry && !renderObject.userData?.skipGeometryDispose) {
    renderObject.geometry.dispose()
  }
  if (renderObject.userData?.skipMaterialDispose) {
    return
  }
  if (Array.isArray(renderObject.material)) {
    for (const material of renderObject.material) {
      material.dispose()
    }
  } else if (renderObject.material) {
    renderObject.material.dispose()
  }
}

export function clearGroup(group: Group) {
  while (group.children.length > 0) {
    const child = group.children[group.children.length - 1]
    if (!child) {
      break
    }
    group.remove(child)
    disposeRenderableObject(child)
  }
}
