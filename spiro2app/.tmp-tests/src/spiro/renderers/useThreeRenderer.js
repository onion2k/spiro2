import { useEffect, useRef } from 'react';
import { ACESFilmicToneMapping, AmbientLight, BufferGeometry, DirectionalLight, DoubleSide, Float32BufferAttribute, Group, HemisphereLight, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, OrthographicCamera, PMREMGenerator, PlaneGeometry, PerspectiveCamera, RingGeometry, Scene, SphereGeometry, WebGLRenderer, } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createRuntimeState, stepRuntime } from './runtime';
import { createThreeCamera, resizeThreeCamera } from './three/camera';
import { clearGroup, createGlowSpriteTexture } from './three/resources';
export function useThreeRenderer(options) {
    const { containerRef, enabled, layers, compiledLayers, isPaused, resetTick, recenterTick, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, amplitudeMod, frequencyMod, phaseMod, noiseMode, noiseAmount, noiseFrequency, noiseSpeed, noiseOctaves, noiseSeed, strokeWidthMode, baseLineWidth, lineWidthBoost, trailSmoothing, dashedLines, dashLength, dashGap, threeCameraMode, threeLineRenderMode, threeSpriteSize, threeSpriteSoftness, autoRotateScene, autoRotateSpeed, showDebugGeometry, lineMaterialColor, lineMaterialMetalness, lineMaterialRoughness, lineMaterialClearcoat, lineMaterialClearcoatRoughness, lineMaterialTransmission, lineMaterialThickness, lineMaterialIor, maxTrailPointsPerLayer, onHudStats, } = options;
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
                    : import('./three/renderFatLines'),
            ]);
            if (disposed) {
                return;
            }
            const renderFatLinesFn = threeLineRenderMode === 'fat-lines' && 'renderFatLines' in renderModules ? renderModules.renderFatLines : null;
            const renderInstancedSpritesFn = threeLineRenderMode === 'instanced-sprites' && 'renderInstancedSprites' in renderModules
                ? renderModules.renderInstancedSprites
                : null;
            const disposeSpriteBatchMeshFn = threeLineRenderMode === 'instanced-sprites' && 'disposeSpriteBatchMesh' in renderModules
                ? renderModules.disposeSpriteBatchMesh
                : null;
            container.replaceChildren();
            const renderer = new WebGLRenderer({ antialias: true });
            renderer.setClearColor(0x020617, 1);
            renderer.setPixelRatio(window.devicePixelRatio || 1);
            renderer.toneMapping = ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
            renderer.domElement.style.display = 'block';
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            container.appendChild(renderer.domElement);
            const scene = new Scene();
            const pmremGenerator = new PMREMGenerator(renderer);
            // Keep blur sigma conservative to avoid THREE.sigmaRadians sample clipping warnings.
            const environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.03).texture;
            scene.environment = environmentMap;
            const ambientLight = new AmbientLight(0xffffff, 0.28);
            const skyFill = new HemisphereLight(0xd6e6ff, 0x111827, 0.26);
            const keyLight = new DirectionalLight(0xffffff, 2.9);
            keyLight.position.set(2600, 2100, 3000);
            const fillLight = new DirectionalLight(0xaec8ff, 0.65);
            fillLight.position.set(-2100, -1600, 1400);
            const rimLight = new DirectionalLight(0xfff1da, 1.45);
            rimLight.position.set(-300, 2300, -3100);
            scene.add(ambientLight, skyFill, keyLight, fillLight, rimLight);
            const drawGroup = new Group();
            scene.add(drawGroup);
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
            let userInteracted = false;
            controls.enabled = false;
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
            let animationFrame = 0;
            let lastWidth = 0;
            let lastHeight = 0;
            let lastFrameMs = 0;
            let nextHudUpdateMs = 0;
            let handledRecenterTick = recenterTickRef.current;
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
                clearGroup(drawGroup);
                let trailPoints = 0;
                let pointVertices = 0;
                let instancedSprites = 0;
                let lineObjects = 0;
                const activeSpriteLayerIds = new Set();
                for (const runtimeLayer of runtime.runtimeLayers) {
                    const layer = runtimeLayer.layer;
                    if (!layer.visible || runtimeLayer.trail.length === 0) {
                        continue;
                    }
                    trailPoints += runtimeLayer.trail.length;
                    const step = runtimeLayer.trail.length > 3000 ? Math.ceil(runtimeLayer.trail.length / 3000) : 1;
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
                            drawGroup.add(sprites);
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
                        });
                        lineObjects += fatLines.length;
                        for (const line of fatLines) {
                            drawGroup.add(line);
                        }
                    }
                }
                if (threeLineRenderMode === 'instanced-sprites' && disposeSpriteBatchMeshFn) {
                    for (const [layerId, spriteMesh] of spriteMeshByLayer) {
                        if (activeSpriteLayerIds.has(layerId)) {
                            continue;
                        }
                        disposeSpriteBatchMeshFn(spriteMesh);
                        spriteMeshByLayer.delete(layerId);
                    }
                }
                else if (disposeSpriteBatchMeshFn) {
                    for (const [layerId, spriteMesh] of spriteMeshByLayer) {
                        disposeSpriteBatchMeshFn(spriteMesh);
                        spriteMeshByLayer.delete(layerId);
                    }
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
                if (disposeSpriteBatchMeshFn) {
                    for (const [, spriteMesh] of spriteMeshByLayer) {
                        disposeSpriteBatchMeshFn(spriteMesh);
                    }
                    spriteMeshByLayer.clear();
                }
                renderer.domElement.removeEventListener('pointerdown', onFirstPointerDown);
                controls.dispose();
                spriteGeometry.dispose();
                spriteTexture.dispose();
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
