import { useEffect, useRef } from 'react';
import { ACESFilmicToneMapping, AmbientLight, Color, BufferGeometry, DirectionalLight, DoubleSide, Float32BufferAttribute, Group, HemisphereLight, Line, LineBasicMaterial, Mesh, MeshPhysicalMaterial, MeshBasicMaterial, OrthographicCamera, PMREMGenerator, PlaneGeometry, PerspectiveCamera, RingGeometry, Scene, SphereGeometry, WebGLRenderer, } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createRuntimeState, stepRuntime } from './runtime';
import { createThreeCamera, resizeThreeCamera } from './three/camera';
import { clearGroup, createGlowSpriteTexture, disposeRenderableObject } from './three/resources';
function hashLayerPhase(layerId) {
    let hash = 2166136261;
    for (let i = 0; i < layerId.length; i += 1) {
        hash ^= layerId.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 360) * (Math.PI / 180);
}
export function useThreeRenderer(options) {
    const { containerRef, enabled, layers, compiledLayers, isPaused, resetTick, recenterTick, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, amplitudeMod, frequencyMod, phaseMod, noiseMode, noiseAmount, noiseFrequency, noiseSpeed, noiseOctaves, noiseSeed, strokeWidthMode, baseLineWidth, lineWidthBoost, trailSmoothing, trailDetailMode, dashedLines, dashLength, dashGap, threeCameraMode, threeLineRenderMode, threeSpriteSize, threeSpriteSoftness, autoRotateScene, autoRotateSpeed, showDebugGeometry, lineMaterialColor, lineMaterialMetalness, lineMaterialRoughness, lineMaterialClearcoat, lineMaterialClearcoatRoughness, lineMaterialTransmission, lineMaterialThickness, lineMaterialIor, maxTrailPointsPerLayer, onHudStats, } = options;
    const recenterTickRef = useRef(recenterTick);
    useEffect(() => {
        recenterTickRef.current = recenterTick;
    }, [recenterTick]);
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const container = containerRef.current;
        if (!container) {
            return;
        }
        let disposed = false;
        let disposeRenderer = null;
        const initializeRenderer = async () => {
            const [{ OrbitControls }, renderModules] = await Promise.all([
                import('three/examples/jsm/controls/OrbitControls.js'),
                threeLineRenderMode === 'instanced-sprites'
                    ? import('./three/renderInstancedSprites')
                    : threeLineRenderMode === 'tube-mesh'
                        ? import('./three/renderTubeMeshes')
                        : import('./three/renderFatLines'),
            ]);
            if (disposed) {
                return;
            }
            const renderFatLinesFn = threeLineRenderMode === 'fat-lines' && 'renderFatLines' in renderModules ? renderModules.renderFatLines : null;
            const renderInstancedSpritesFn = threeLineRenderMode === 'instanced-sprites' && 'renderInstancedSprites' in renderModules
                ? renderModules.renderInstancedSprites
                : null;
            const renderTubeMeshesFn = threeLineRenderMode === 'tube-mesh' && 'renderTubeMeshes' in renderModules ? renderModules.renderTubeMeshes : null;
            const disposeSpriteBatchMeshFn = threeLineRenderMode === 'instanced-sprites' && 'disposeSpriteBatchMesh' in renderModules
                ? renderModules.disposeSpriteBatchMesh
                : null;
            container.replaceChildren();
            const renderer = new WebGLRenderer({ antialias: true });
            renderer.setClearColor(0x020617, 1);
            renderer.setPixelRatio(window.devicePixelRatio || 1);
            renderer.toneMapping = ACESFilmicToneMapping;
            renderer.toneMappingExposure = threeLineRenderMode === 'tube-mesh' ? 1.36 : 1.2;
            renderer.domElement.style.display = 'block';
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            container.appendChild(renderer.domElement);
            const scene = new Scene();
            const pmremGenerator = new PMREMGenerator(renderer);
            // Keep blur sigma conservative to avoid THREE.sigmaRadians sample clipping warnings.
            const environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.03).texture;
            scene.environment = environmentMap;
            const ambientLight = new AmbientLight(0xffffff, threeLineRenderMode === 'tube-mesh' ? 0.36 : 0.28);
            const skyFill = new HemisphereLight(0xd6e6ff, 0x111827, 0.26);
            const keyLight = new DirectionalLight(0xffffff, threeLineRenderMode === 'tube-mesh' ? 3.5 : 2.9);
            keyLight.position.set(2600, 2100, 3000);
            const fillLight = new DirectionalLight(0xaec8ff, 0.65);
            fillLight.position.set(-2100, -1600, 1400);
            const rimLight = new DirectionalLight(0xfff1da, threeLineRenderMode === 'tube-mesh' ? 1.9 : 1.45);
            rimLight.position.set(-300, 2300, -3100);
            scene.add(ambientLight, skyFill, keyLight, fillLight, rimLight);
            const drawGroup = new Group();
            scene.add(drawGroup);
            const trailStartMarkerGroup = new Group();
            scene.add(trailStartMarkerGroup);
            const centerMarkerGeometry = new SphereGeometry(150, 28, 20);
            const centerMarkerMaterial = new MeshBasicMaterial({
                color: 0xff2d55,
                toneMapped: false,
                depthTest: false,
                depthWrite: false,
                transparent: true,
                opacity: 0.95,
            });
            const centerMarker = new Mesh(centerMarkerGeometry, centerMarkerMaterial);
            centerMarker.position.set(0, 0, 0);
            centerMarker.frustumCulled = false;
            centerMarker.renderOrder = 999;
            centerMarker.visible = showDebugGeometry;
            scene.add(centerMarker);
            const centerMarkerCoreGeometry = new SphereGeometry(60, 22, 16);
            const centerMarkerCoreMaterial = new MeshBasicMaterial({
                color: 0xffffff,
                toneMapped: false,
                depthTest: false,
                depthWrite: false,
                transparent: true,
                opacity: 0.98,
            });
            const centerMarkerCore = new Mesh(centerMarkerCoreGeometry, centerMarkerCoreMaterial);
            centerMarkerCore.position.set(0, 0, 0);
            centerMarkerCore.frustumCulled = false;
            centerMarkerCore.renderOrder = 1000;
            centerMarkerCore.visible = showDebugGeometry;
            scene.add(centerMarkerCore);
            const debugAxisGeometry = new BufferGeometry();
            debugAxisGeometry.setAttribute('position', new Float32BufferAttribute([
                -2400, 0, 0, 2400, 0, 0,
                0, -2400, 0, 0, 2400, 0,
                0, 0, -2400, 0, 0, 2400,
            ], 3));
            const debugAxisMaterial = new LineBasicMaterial({
                color: 0x60a5fa,
                transparent: true,
                opacity: 0.9,
                depthTest: false,
                depthWrite: false,
            });
            const debugAxis = new Line(debugAxisGeometry, debugAxisMaterial);
            debugAxis.frustumCulled = false;
            debugAxis.renderOrder = 995;
            debugAxis.visible = showDebugGeometry;
            scene.add(debugAxis);
            const debugRingGeometry = new RingGeometry(900, 920, 64);
            const debugRingMaterial = new MeshBasicMaterial({
                color: 0x22d3ee,
                transparent: true,
                opacity: 0.65,
                side: DoubleSide,
                depthTest: false,
                depthWrite: false,
            });
            const debugRing = new Mesh(debugRingGeometry, debugRingMaterial);
            debugRing.position.set(0, 0, 0);
            debugRing.frustumCulled = false;
            debugRing.renderOrder = 996;
            debugRing.visible = showDebugGeometry;
            scene.add(debugRing);
            const spriteGeometry = new PlaneGeometry(1, 1);
            const spriteTexture = createGlowSpriteTexture();
            const trailStartOuterGeometry = new SphereGeometry(26, 18, 14);
            const trailStartCoreGeometry = new SphereGeometry(9, 14, 10);
            const camera = createThreeCamera(threeCameraMode);
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.enablePan = true;
            controls.enableZoom = true;
            controls.enableRotate = true;
            controls.screenSpacePanning = true;
            controls.autoRotate = autoRotateScene;
            controls.autoRotateSpeed = autoRotateSpeed;
            let userInteracted = autoRotateScene;
            controls.enabled = autoRotateScene;
            const onFirstPointerDown = () => {
                userInteracted = true;
                controls.enabled = true;
                renderer.domElement.removeEventListener('pointerdown', onFirstPointerDown);
            };
            renderer.domElement.addEventListener('pointerdown', onFirstPointerDown, { passive: true });
            controls.target.set(0, 0, 0);
            camera.position.set(0, 0, 2000);
            camera.lookAt(0, 0, 0);
            controls.update();
            const runtime = createRuntimeState(layers, compiledLayers);
            const spriteMeshByLayer = new Map();
            const fatLineMeshesByLayer = new Map();
            const fatLineMaterialByLayer = new Map();
            const trailStartMarkersByLayer = new Map();
            let staticTubeReady = false;
            let staticTubeTrailPoints = 0;
            let staticTubeLineObjects = 0;
            let animationFrame = 0;
            let lastWidth = 0;
            let lastHeight = 0;
            let lastFrameMs = 0;
            let nextHudUpdateMs = 0;
            let handledRecenterTick = recenterTickRef.current;
            const maxVisibleTrailSamplesPerLayer = trailDetailMode === 'detailed' ? 9000 : 3000;
            const enforceStartupPose = (width, height) => {
                const startupDistance = 2000;
                camera.position.set(0, 0, startupDistance);
                controls.target.set(0, 0, 0);
                if (camera instanceof PerspectiveCamera) {
                    camera.aspect = width / Math.max(1, height);
                    camera.near = 0.1;
                    camera.far = Math.max(12000, startupDistance * 12);
                    camera.updateProjectionMatrix();
                }
                else if (camera instanceof OrthographicCamera) {
                    camera.left = -width / 2;
                    camera.right = width / 2;
                    camera.top = height / 2;
                    camera.bottom = -height / 2;
                    camera.near = 0.1;
                    camera.far = Math.max(12000, startupDistance * 12);
                    camera.updateProjectionMatrix();
                }
                camera.lookAt(0, 0, 0);
            };
            const resize = () => {
                const width = Math.max(1, container.clientWidth);
                const height = Math.max(1, container.clientHeight);
                renderer.setSize(width, height, true);
                resizeThreeCamera({
                    camera,
                    mode: threeCameraMode,
                    width,
                    height,
                    userInteracted: true,
                    setTarget: (x, y, z) => controls.target.set(x, y, z),
                });
                if (!userInteracted) {
                    enforceStartupPose(width, height);
                }
                if (controls.enabled) {
                    controls.update();
                }
            };
            const draw = (timeMs) => {
                const frameMs = lastFrameMs > 0 ? Math.max(1, timeMs - lastFrameMs) : 16.67;
                lastFrameMs = timeMs;
                const width = Math.max(1, container.clientWidth);
                const height = Math.max(1, container.clientHeight);
                if (width !== lastWidth || height !== lastHeight) {
                    lastWidth = width;
                    lastHeight = height;
                    resize();
                }
                if (handledRecenterTick !== recenterTickRef.current) {
                    handledRecenterTick = recenterTickRef.current;
                    enforceStartupPose(width, height);
                    if (controls.enabled) {
                        controls.update();
                    }
                }
                let trailPoints = 0;
                let pointVertices = 0;
                let instancedSprites = 0;
                let lineObjects = 0;
                const activeSpriteLayerIds = new Set();
                const activeFatLineLayerIds = new Set();
                const activeTrailStartMarkerLayerIds = new Set();
                if (threeLineRenderMode === 'tube-mesh' && renderTubeMeshesFn) {
                    if (!staticTubeReady) {
                        const staticLayers = layers.map((layer) => ({ ...layer, lineForever: true }));
                        for (const runtimeLayer of runtime.runtimeLayers) {
                            runtimeLayer.paramT = 0;
                            runtimeLayer.paramU = 0;
                            runtimeLayer.previous = null;
                            runtimeLayer.previousDirection = null;
                            runtimeLayer.trail = [];
                            runtimeLayer.pointIndex = 0;
                        }
                        runtime.prevTimeMs = 0;
                        const sampleCount = Math.max(1200, Math.min(maxTrailPointsPerLayer, 30000));
                        const sampleStepMs = 1000 / 120;
                        let sampleTimeMs = 0;
                        for (let i = 0; i < sampleCount; i += 1) {
                            sampleTimeMs += sampleStepMs;
                            stepRuntime({
                                state: runtime,
                                layers: staticLayers,
                                compiledLayers,
                                isPaused: false,
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
                                timeMs: sampleTimeMs,
                                width,
                                height,
                            });
                        }
                        const { center } = stepRuntime({
                            state: runtime,
                            layers: staticLayers,
                            compiledLayers,
                            isPaused: true,
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
                            timeMs: sampleTimeMs,
                            width,
                            height,
                        });
                        clearGroup(drawGroup);
                        for (const runtimeLayer of runtime.runtimeLayers) {
                            if (!runtimeLayer.layer.visible || runtimeLayer.trail.length === 0) {
                                continue;
                            }
                            trailPoints += runtimeLayer.trail.length;
                            const step = runtimeLayer.trail.length > 15000 ? Math.ceil(runtimeLayer.trail.length / 15000) : 1;
                            const tubeMeshes = renderTubeMeshesFn({
                                runtimeLayer,
                                center,
                                step,
                                mirrorX,
                                mirrorY,
                                rotationalRepeats,
                                rotationOffsetDeg,
                                baseLineWidth,
                                lineWidthBoost,
                                trailSmoothing,
                                lineMaterialColor,
                                lineMaterialMetalness,
                                lineMaterialRoughness,
                                lineMaterialClearcoat,
                                lineMaterialClearcoatRoughness,
                            });
                            lineObjects += tubeMeshes.length;
                            for (const tube of tubeMeshes) {
                                drawGroup.add(tube);
                            }
                        }
                        staticTubeTrailPoints = trailPoints;
                        staticTubeLineObjects = lineObjects;
                        staticTubeReady = true;
                    }
                    else {
                        trailPoints = staticTubeTrailPoints;
                        lineObjects = staticTubeLineObjects;
                    }
                }
                else {
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
                        timeMs,
                        width,
                        height,
                    });
                    for (const runtimeLayer of runtime.runtimeLayers) {
                        const layer = runtimeLayer.layer;
                        if (!layer.visible || runtimeLayer.trail.length === 0) {
                            continue;
                        }
                        trailPoints += runtimeLayer.trail.length;
                        const step = runtimeLayer.trail.length > maxVisibleTrailSamplesPerLayer
                            ? Math.ceil(runtimeLayer.trail.length / maxVisibleTrailSamplesPerLayer)
                            : 1;
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
                                trailSmoothing,
                                dashedLines,
                                dashLength,
                                dashGap,
                                existingMesh: spriteMeshByLayer.get(runtimeLayer.layer.id) ?? undefined,
                            });
                            if (sprites) {
                                activeSpriteLayerIds.add(runtimeLayer.layer.id);
                                spriteMeshByLayer.set(runtimeLayer.layer.id, sprites);
                                const spriteCount = typeof sprites.userData?.spriteInstanceCount === 'number' ? sprites.userData.spriteInstanceCount : 0;
                                instancedSprites += spriteCount;
                                lineObjects += 1;
                                if (sprites.parent !== drawGroup) {
                                    drawGroup.add(sprites);
                                }
                            }
                        }
                        else if (threeLineRenderMode === 'fat-lines' && renderFatLinesFn) {
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
                                trailSmoothing,
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
                                existingMeshes: fatLineMeshesByLayer.get(runtimeLayer.layer.id) ?? [],
                                existingMaterial: fatLineMaterialByLayer.get(runtimeLayer.layer.id),
                            });
                            activeFatLineLayerIds.add(runtimeLayer.layer.id);
                            const previousLayerMeshes = fatLineMeshesByLayer.get(runtimeLayer.layer.id);
                            if (previousLayerMeshes && previousLayerMeshes.length > fatLines.length) {
                                for (let i = fatLines.length; i < previousLayerMeshes.length; i += 1) {
                                    const staleMesh = previousLayerMeshes[i];
                                    if (!staleMesh) {
                                        continue;
                                    }
                                    if (staleMesh.parent === drawGroup) {
                                        drawGroup.remove(staleMesh);
                                    }
                                    disposeRenderableObject(staleMesh);
                                }
                            }
                            fatLineMeshesByLayer.set(runtimeLayer.layer.id, fatLines);
                            if (fatLines.length > 0 && fatLines[0]?.material instanceof MeshPhysicalMaterial) {
                                fatLineMaterialByLayer.set(runtimeLayer.layer.id, fatLines[0].material);
                            }
                            lineObjects += fatLines.length;
                            for (const line of fatLines) {
                                drawGroup.add(line);
                            }
                        }
                    }
                    if (threeLineRenderMode === 'fat-lines') {
                        for (const [layerId, meshes] of fatLineMeshesByLayer) {
                            if (activeFatLineLayerIds.has(layerId)) {
                                continue;
                            }
                            for (const mesh of meshes) {
                                if (mesh.parent === drawGroup) {
                                    drawGroup.remove(mesh);
                                }
                                disposeRenderableObject(mesh);
                            }
                            fatLineMeshesByLayer.delete(layerId);
                            fatLineMaterialByLayer.delete(layerId);
                        }
                    }
                    else if (fatLineMeshesByLayer.size > 0) {
                        for (const [, meshes] of fatLineMeshesByLayer) {
                            for (const mesh of meshes) {
                                if (mesh.parent === drawGroup) {
                                    drawGroup.remove(mesh);
                                }
                                disposeRenderableObject(mesh);
                            }
                        }
                        fatLineMeshesByLayer.clear();
                        fatLineMaterialByLayer.clear();
                    }
                }
                if (threeLineRenderMode === 'instanced-sprites' && disposeSpriteBatchMeshFn) {
                    for (const [layerId, spriteMesh] of spriteMeshByLayer) {
                        if (activeSpriteLayerIds.has(layerId)) {
                            continue;
                        }
                        if (spriteMesh.parent === drawGroup) {
                            drawGroup.remove(spriteMesh);
                        }
                        disposeSpriteBatchMeshFn(spriteMesh);
                        spriteMeshByLayer.delete(layerId);
                    }
                }
                else if (disposeSpriteBatchMeshFn) {
                    for (const [layerId, spriteMesh] of spriteMeshByLayer) {
                        if (spriteMesh.parent === drawGroup) {
                            drawGroup.remove(spriteMesh);
                        }
                        disposeSpriteBatchMeshFn(spriteMesh);
                        spriteMeshByLayer.delete(layerId);
                    }
                }
                for (const runtimeLayer of runtime.runtimeLayers) {
                    const layer = runtimeLayer.layer;
                    const startPoint = runtimeLayer.trail[0];
                    if (!layer.visible || !startPoint) {
                        continue;
                    }
                    activeTrailStartMarkerLayerIds.add(layer.id);
                    let marker = trailStartMarkersByLayer.get(layer.id);
                    if (!marker) {
                        const hue = (((layer.baseHue % 360) + 360) % 360) / 360;
                        const outerColor = new Color().setHSL(hue, 0.95, 0.62);
                        const coreColor = new Color().setHSL(hue, 1, 0.82);
                        const outerMaterial = new MeshBasicMaterial({
                            color: outerColor,
                            toneMapped: false,
                            transparent: true,
                            opacity: 0.7,
                            depthTest: false,
                            depthWrite: false,
                        });
                        const coreMaterial = new MeshBasicMaterial({
                            color: coreColor,
                            toneMapped: false,
                            transparent: true,
                            opacity: 0.95,
                            depthTest: false,
                            depthWrite: false,
                        });
                        const outer = new Mesh(trailStartOuterGeometry, outerMaterial);
                        const core = new Mesh(trailStartCoreGeometry, coreMaterial);
                        outer.renderOrder = 910;
                        core.renderOrder = 911;
                        outer.frustumCulled = false;
                        core.frustumCulled = false;
                        trailStartMarkerGroup.add(outer, core);
                        marker = {
                            outer,
                            core,
                            phaseOffset: hashLayerPhase(layer.id),
                        };
                        trailStartMarkersByLayer.set(layer.id, marker);
                    }
                    const x = startPoint.x - width * 0.5;
                    const y = height * 0.5 - startPoint.y;
                    const z = startPoint.z;
                    const pulse = 0.7 + 0.3 * Math.sin(timeMs * 0.009 + marker.phaseOffset);
                    const flicker = 0.6 + 0.4 * Math.sin(timeMs * 0.016 + marker.phaseOffset * 1.7);
                    marker.outer.position.set(x, y, z);
                    marker.core.position.set(x, y, z);
                    marker.outer.scale.setScalar(0.95 + pulse * 0.7);
                    marker.core.scale.setScalar(0.85 + pulse * 0.35);
                    marker.outer.material.opacity = 0.38 + flicker * 0.34;
                    marker.core.material.opacity = 0.72 + flicker * 0.28;
                }
                for (const [layerId, marker] of trailStartMarkersByLayer) {
                    if (activeTrailStartMarkerLayerIds.has(layerId)) {
                        continue;
                    }
                    trailStartMarkerGroup.remove(marker.outer, marker.core);
                    disposeRenderableObject(marker.outer);
                    disposeRenderableObject(marker.core);
                    trailStartMarkersByLayer.delete(layerId);
                }
                if (controls.enabled) {
                    controls.update();
                }
                if (!userInteracted) {
                    enforceStartupPose(width, height);
                }
                renderer.render(scene, camera);
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
                    });
                    nextHudUpdateMs = timeMs + 250;
                }
                animationFrame = requestAnimationFrame(draw);
            };
            resize();
            window.addEventListener('resize', resize);
            animationFrame = requestAnimationFrame(draw);
            disposeRenderer = () => {
                cancelAnimationFrame(animationFrame);
                window.removeEventListener('resize', resize);
                clearGroup(drawGroup);
                clearGroup(trailStartMarkerGroup);
                if (disposeSpriteBatchMeshFn) {
                    for (const [, spriteMesh] of spriteMeshByLayer) {
                        disposeSpriteBatchMeshFn(spriteMesh);
                    }
                    spriteMeshByLayer.clear();
                }
                fatLineMeshesByLayer.clear();
                fatLineMaterialByLayer.clear();
                trailStartMarkersByLayer.clear();
                renderer.domElement.removeEventListener('pointerdown', onFirstPointerDown);
                controls.dispose();
                spriteGeometry.dispose();
                spriteTexture.dispose();
                trailStartOuterGeometry.dispose();
                trailStartCoreGeometry.dispose();
                centerMarkerGeometry.dispose();
                centerMarkerMaterial.dispose();
                centerMarkerCoreGeometry.dispose();
                centerMarkerCoreMaterial.dispose();
                debugAxisGeometry.dispose();
                debugAxisMaterial.dispose();
                debugRingGeometry.dispose();
                debugRingMaterial.dispose();
                environmentMap.dispose();
                pmremGenerator.dispose();
                renderer.dispose();
                container.replaceChildren();
            };
        };
        void initializeRenderer();
        return () => {
            disposed = true;
            disposeRenderer?.();
        };
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
        trailSmoothing,
        trailDetailMode,
        dashedLines,
        dashLength,
        dashGap,
        threeCameraMode,
        threeLineRenderMode,
        threeSpriteSize,
        threeSpriteSoftness,
        autoRotateScene,
        autoRotateSpeed,
        showDebugGeometry,
        lineMaterialColor,
        lineMaterialMetalness,
        lineMaterialRoughness,
        lineMaterialClearcoat,
        lineMaterialClearcoatRoughness,
        lineMaterialTransmission,
        lineMaterialThickness,
        lineMaterialIor,
        maxTrailPointsPerLayer,
        onHudStats,
    ]);
}
