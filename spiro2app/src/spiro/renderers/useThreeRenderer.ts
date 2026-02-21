import { useEffect } from 'react'
import type { RefObject } from 'react'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  Group,
  HemisphereLight,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

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
    globalDrawMode,
    threeCameraMode,
    threeLineRenderMode,
    threeSpriteSize,
    threeSpriteSoftness,
    autoRotateScene,
    autoRotateSpeed,
    lineMaterialColor,
    lineMaterialMetalness,
    lineMaterialRoughness,
    lineMaterialClearcoat,
    lineMaterialClearcoatRoughness,
    lineMaterialTransmission,
    lineMaterialThickness,
    lineMaterialIor,
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
      const disposeSpriteBatchMeshFn =
        threeLineRenderMode === 'instanced-sprites' && 'disposeSpriteBatchMesh' in renderModules
          ? renderModules.disposeSpriteBatchMesh
          : null

      container.replaceChildren()
      const renderer = new WebGLRenderer({ antialias: true })
      renderer.setClearColor(0x020617, 1)
      renderer.setPixelRatio(window.devicePixelRatio || 1)
      renderer.toneMapping = ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.2
      container.appendChild(renderer.domElement)

      const scene = new Scene()
      const pmremGenerator = new PMREMGenerator(renderer)
      const environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.08).texture
      scene.environment = environmentMap
      const ambientLight = new AmbientLight(0xffffff, 0.72)
      const skyFill = new HemisphereLight(0xd6e6ff, 0x111827, 0.55)
      const keyLight = new DirectionalLight(0xffffff, 2.2)
      keyLight.position.set(2200, 2400, 2800)
      const fillLight = new DirectionalLight(0xaec8ff, 1.1)
      fillLight.position.set(-1900, -1400, 2100)
      const rimLight = new DirectionalLight(0xfff1da, 0.75)
      rimLight.position.set(0, 1800, -2400)
      scene.add(ambientLight, skyFill, keyLight, fillLight, rimLight)
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
      controls.autoRotate = autoRotateScene
      controls.autoRotateSpeed = autoRotateSpeed

      let userInteracted = false
      controls.addEventListener('start', () => {
        userInteracted = true
      })

      const runtime = createRuntimeState(layers, compiledLayers)
      const spriteMeshByLayer = new Map<string, NonNullable<ReturnType<NonNullable<typeof renderInstancedSpritesFn>>>>()
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
        const activeSpriteLayerIds = new Set<string>()

        for (const runtimeLayer of runtime.runtimeLayers) {
          const layer = runtimeLayer.layer
          if (!layer.visible || runtimeLayer.trail.length === 0) {
            continue
          }
          trailPoints += runtimeLayer.trail.length
          const step = runtimeLayer.trail.length > 3000 ? Math.ceil(runtimeLayer.trail.length / 3000) : 1
          const shouldDrawLines = globalDrawMode === 'lines'
          const shouldDrawPoints = globalDrawMode === 'points'

          if (shouldDrawLines) {
            if (threeLineRenderMode === 'instanced-sprites' && renderInstancedSpritesFn) {
              const sprites = renderInstancedSpritesFn({
                runtimeLayer,
                center,
                nowSec,
                width,
                height,
                step,
                camera,
                spriteGeometry,
                spriteTexture,
                spriteSizeScale: threeSpriteSize,
                spriteSoftness: threeSpriteSoftness,
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
                existingMesh: spriteMeshByLayer.get(runtimeLayer.layer.id) ?? undefined,
              })
              if (sprites) {
                activeSpriteLayerIds.add(runtimeLayer.layer.id)
                spriteMeshByLayer.set(runtimeLayer.layer.id, sprites)
                const spriteCount =
                  typeof sprites.userData?.spriteInstanceCount === 'number'
                    ? sprites.userData.spriteInstanceCount
                    : 0
                instancedSprites += spriteCount
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
                lineMaterialColor,
                lineMaterialMetalness,
                lineMaterialRoughness,
                lineMaterialClearcoat,
                lineMaterialClearcoatRoughness,
                lineMaterialTransmission,
                lineMaterialThickness,
                lineMaterialIor,
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

        if (threeLineRenderMode === 'instanced-sprites' && disposeSpriteBatchMeshFn) {
          for (const [layerId, spriteMesh] of spriteMeshByLayer) {
            if (activeSpriteLayerIds.has(layerId)) {
              continue
            }
            disposeSpriteBatchMeshFn(spriteMesh)
            spriteMeshByLayer.delete(layerId)
          }
        } else if (disposeSpriteBatchMeshFn) {
          for (const [layerId, spriteMesh] of spriteMeshByLayer) {
            disposeSpriteBatchMeshFn(spriteMesh)
            spriteMeshByLayer.delete(layerId)
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
        if (disposeSpriteBatchMeshFn) {
          for (const [, spriteMesh] of spriteMeshByLayer) {
            disposeSpriteBatchMeshFn(spriteMesh)
          }
          spriteMeshByLayer.clear()
        }
        controls.dispose()
        spriteGeometry.dispose()
        spriteTexture.dispose()
        environmentMap.dispose()
        pmremGenerator.dispose()
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
    globalDrawMode,
    threeCameraMode,
    threeLineRenderMode,
    threeSpriteSize,
    threeSpriteSoftness,
    autoRotateScene,
    autoRotateSpeed,
    lineMaterialColor,
    lineMaterialMetalness,
    lineMaterialRoughness,
    lineMaterialClearcoat,
    lineMaterialClearcoatRoughness,
    lineMaterialTransmission,
    lineMaterialThickness,
    lineMaterialIor,
    maxTrailPointsPerLayer,
    adaptiveQuality,
    maxAdaptiveStep,
    onHudStats,
  ])
}
