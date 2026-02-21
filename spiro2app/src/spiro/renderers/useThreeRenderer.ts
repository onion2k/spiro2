import { useEffect } from 'react'
import type { RefObject } from 'react'
import { Group, PlaneGeometry, Scene, WebGLRenderer } from 'three'

import type { RendererHudStats, SpiroRendererConfig } from './types'
import { createRuntimeState, stepRuntime } from './runtime'
import { createThreeCamera, resizeThreeCamera } from './three/camera'
import { renderPoints } from './three/renderPoints'
import { clearGroup, createGlowSpriteTexture } from './three/resources'

type ThreeRendererOptions = SpiroRendererConfig & {
  containerRef: RefObject<HTMLDivElement | null>
  enabled: boolean
  onHudStats?: (stats: RendererHudStats) => void
}

export function useThreeRenderer(options: ThreeRendererOptions) {
  const {
    containerRef,
    enabled,
    layers,
    compiledLayers,
    isPaused,
    resetTick,
    mirrorX,
    mirrorY,
    rotationalRepeats,
    rotationOffsetDeg,
    amplitudeMod,
    frequencyMod,
    phaseMod,
    noiseMode,
    noiseAmount,
    noiseFrequency,
    noiseSpeed,
    noiseOctaves,
    noiseSeed,
    strokeWidthMode,
    baseLineWidth,
    lineWidthBoost,
    dashedLines,
    dashLength,
    dashGap,
    threeCameraMode,
    threeLineRenderMode,
    maxTrailPointsPerLayer,
    adaptiveQuality,
    maxAdaptiveStep,
    onHudStats,
  } = options

  useEffect(() => {
    if (!enabled) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    let disposed = false
    let disposeRenderer: (() => void) | null = null

    const initializeRenderer = async () => {
      const [{ OrbitControls }, renderModules] = await Promise.all([
        import('three/examples/jsm/controls/OrbitControls.js'),
        threeLineRenderMode === 'instanced-sprites'
          ? import('./three/renderInstancedSprites')
          : import('./three/renderFatLines'),
      ])

      if (disposed) {
        return
      }

      const renderFatLinesFn =
        threeLineRenderMode === 'fat-lines' && 'renderFatLines' in renderModules ? renderModules.renderFatLines : null
      const renderInstancedSpritesFn =
        threeLineRenderMode === 'instanced-sprites' && 'renderInstancedSprites' in renderModules
          ? renderModules.renderInstancedSprites
          : null

      container.replaceChildren()
      const renderer = new WebGLRenderer({ antialias: true })
      renderer.setClearColor(0x020617, 1)
      renderer.setPixelRatio(window.devicePixelRatio || 1)
      container.appendChild(renderer.domElement)

      const scene = new Scene()
      const drawGroup = new Group()
      scene.add(drawGroup)

      const spriteGeometry = new PlaneGeometry(1, 1)
      const spriteTexture = createGlowSpriteTexture()
      const camera = createThreeCamera(threeCameraMode)
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.enablePan = true
      controls.enableZoom = true
      controls.enableRotate = true
      controls.screenSpacePanning = true

      let userInteracted = false
      controls.addEventListener('start', () => {
        userInteracted = true
      })

      const runtime = createRuntimeState(layers, compiledLayers)
      let animationFrame = 0
      let lastWidth = 0
      let lastHeight = 0
      let lastFrameMs = 0
      let nextHudUpdateMs = 0

      const resize = () => {
        const width = Math.max(1, container.clientWidth)
        const height = Math.max(1, container.clientHeight)
        renderer.setSize(width, height, false)
        resizeThreeCamera({
          camera,
          mode: threeCameraMode,
          width,
          height,
          userInteracted,
          setTarget: (x, y, z) => controls.target.set(x, y, z),
        })
        controls.update()
      }

      const draw = (timeMs: number) => {
        const frameMs = lastFrameMs > 0 ? Math.max(1, timeMs - lastFrameMs) : 16.67
        lastFrameMs = timeMs
        const width = Math.max(1, container.clientWidth)
        const height = Math.max(1, container.clientHeight)
        if (width !== lastWidth || height !== lastHeight) {
          lastWidth = width
          lastHeight = height
          resize()
        }

        const { center, nowSec } = stepRuntime({
          state: runtime,
          layers,
          compiledLayers,
          isPaused,
          amplitudeMod,
          frequencyMod,
          phaseMod,
          noiseMode,
          noiseAmount,
          noiseFrequency,
          noiseSpeed,
          noiseOctaves,
          noiseSeed,
          maxTrailPointsPerLayer,
          adaptiveQuality,
          maxAdaptiveStep,
          timeMs,
          width,
          height,
        })

        clearGroup(drawGroup)
        let trailPoints = 0
        let pointVertices = 0
        let instancedSprites = 0
        let lineObjects = 0

        for (const runtimeLayer of runtime.runtimeLayers) {
          const layer = runtimeLayer.layer
          if (!layer.visible || runtimeLayer.trail.length === 0) {
            continue
          }
          trailPoints += runtimeLayer.trail.length
          const step = runtimeLayer.trail.length > 3000 ? Math.ceil(runtimeLayer.trail.length / 3000) : 1
          const shouldDrawLines = layer.drawMode === 'lines' || layer.drawMode === 'lines-points'
          const shouldDrawPoints = layer.drawMode === 'points' || layer.drawMode === 'lines-points'

          if (shouldDrawLines) {
            if (threeLineRenderMode === 'instanced-sprites' && renderInstancedSpritesFn) {
              const sprites = renderInstancedSpritesFn({
                runtimeLayer,
                center,
                nowSec,
                step,
                camera,
                spriteGeometry,
                spriteTexture,
                mirrorX,
                mirrorY,
                rotationalRepeats,
                rotationOffsetDeg,
                strokeWidthMode,
                baseLineWidth,
                lineWidthBoost,
                dashedLines,
                dashLength,
                dashGap,
              })
              if (sprites) {
                instancedSprites += sprites.count
                lineObjects += 1
                drawGroup.add(sprites)
              }
            } else if (threeLineRenderMode === 'fat-lines' && renderFatLinesFn) {
              const fatLines = renderFatLinesFn({
                runtimeLayer,
                center,
                nowSec,
                width,
                height,
                step,
                mirrorX,
                mirrorY,
                rotationalRepeats,
                rotationOffsetDeg,
                strokeWidthMode,
                baseLineWidth,
                lineWidthBoost,
                dashedLines,
                dashLength,
                dashGap,
              })
              lineObjects += fatLines.length
              for (const line of fatLines) {
                drawGroup.add(line)
              }
            }
          }

          if (shouldDrawPoints) {
            const points = renderPoints({
              runtimeLayer,
              center,
              nowSec,
              step,
              mirrorX,
              mirrorY,
              rotationalRepeats,
              rotationOffsetDeg,
            })
            if (points) {
              pointVertices += points.geometry.getAttribute('position').count
              drawGroup.add(points)
            }
          }
        }

        controls.update()
        renderer.render(scene, camera)

        if (onHudStats && timeMs >= nextHudUpdateMs) {
          onHudStats({
            fps: 1000 / frameMs,
            frameMs,
            drawCalls: renderer.info.render.calls,
            renderedObjects: drawGroup.children.length,
            trailPoints,
            pointVertices,
            instancedSprites,
            lineObjects,
            threeCameraMode,
            threeLineRenderMode,
          })
          nextHudUpdateMs = timeMs + 250
        }

        animationFrame = requestAnimationFrame(draw)
      }

      resize()
      window.addEventListener('resize', resize)
      animationFrame = requestAnimationFrame(draw)

      disposeRenderer = () => {
        cancelAnimationFrame(animationFrame)
        window.removeEventListener('resize', resize)
        clearGroup(drawGroup)
        controls.dispose()
        spriteGeometry.dispose()
        spriteTexture.dispose()
        renderer.dispose()
        container.replaceChildren()
      }
    }

    void initializeRenderer()

    return () => {
      disposed = true
      disposeRenderer?.()
    }
  }, [
    containerRef,
    enabled,
    layers,
    compiledLayers,
    isPaused,
    resetTick,
    mirrorX,
    mirrorY,
    rotationalRepeats,
    rotationOffsetDeg,
    amplitudeMod,
    frequencyMod,
    phaseMod,
    noiseMode,
    noiseAmount,
    noiseFrequency,
    noiseSpeed,
    noiseOctaves,
    noiseSeed,
    strokeWidthMode,
    baseLineWidth,
    lineWidthBoost,
    dashedLines,
    dashLength,
    dashGap,
    threeCameraMode,
    threeLineRenderMode,
    maxTrailPointsPerLayer,
    adaptiveQuality,
    maxAdaptiveStep,
    onHudStats,
  ])
}
