import { useEffect } from 'react';
import { Group, PlaneGeometry, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createRuntimeState, stepRuntime } from './runtime';
import { createThreeCamera, resizeThreeCamera } from './three/camera';
import { renderFatLines } from './three/renderFatLines';
import { renderInstancedSprites } from './three/renderInstancedSprites';
import { renderPoints } from './three/renderPoints';
import { clearGroup, createGlowSpriteTexture } from './three/resources';
export function useThreeRenderer(options) {
    const { containerRef, enabled, layers, compiledLayers, isPaused, resetTick, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, amplitudeMod, frequencyMod, phaseMod, noiseMode, noiseAmount, noiseFrequency, noiseSpeed, noiseOctaves, noiseSeed, strokeWidthMode, baseLineWidth, lineWidthBoost, dashedLines, dashLength, dashGap, threeCameraMode, threeLineRenderMode, maxTrailPointsPerLayer, adaptiveQuality, maxAdaptiveStep, } = options;
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const container = containerRef.current;
        if (!container) {
            return;
        }
        container.replaceChildren();
        const renderer = new WebGLRenderer({ antialias: true });
        renderer.setClearColor(0x020617, 1);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        container.appendChild(renderer.domElement);
        const scene = new Scene();
        const drawGroup = new Group();
        scene.add(drawGroup);
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
        let userInteracted = false;
        controls.addEventListener('start', () => {
            userInteracted = true;
        });
        const runtime = createRuntimeState(layers, compiledLayers);
        let animationFrame = 0;
        let lastWidth = 0;
        let lastHeight = 0;
        const resize = () => {
            const width = Math.max(1, container.clientWidth);
            const height = Math.max(1, container.clientHeight);
            renderer.setSize(width, height, false);
            resizeThreeCamera({
                camera,
                mode: threeCameraMode,
                width,
                height,
                userInteracted,
                setTarget: (x, y, z) => controls.target.set(x, y, z),
            });
            controls.update();
        };
        const draw = (timeMs) => {
            const width = Math.max(1, container.clientWidth);
            const height = Math.max(1, container.clientHeight);
            if (width !== lastWidth || height !== lastHeight) {
                lastWidth = width;
                lastHeight = height;
                resize();
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
            });
            clearGroup(drawGroup);
            for (const runtimeLayer of runtime.runtimeLayers) {
                const layer = runtimeLayer.layer;
                if (!layer.visible || runtimeLayer.trail.length === 0) {
                    continue;
                }
                const step = runtimeLayer.trail.length > 3000 ? Math.ceil(runtimeLayer.trail.length / 3000) : 1;
                const shouldDrawLines = layer.drawMode === 'lines' || layer.drawMode === 'lines-points';
                const shouldDrawPoints = layer.drawMode === 'points' || layer.drawMode === 'lines-points';
                if (shouldDrawLines) {
                    if (threeLineRenderMode === 'instanced-sprites') {
                        const sprites = renderInstancedSprites({
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
                        });
                        if (sprites) {
                            drawGroup.add(sprites);
                        }
                    }
                    else {
                        const fatLines = renderFatLines({
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
                        });
                        for (const line of fatLines) {
                            drawGroup.add(line);
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
                    });
                    if (points) {
                        drawGroup.add(points);
                    }
                }
            }
            controls.update();
            renderer.render(scene, camera);
            animationFrame = requestAnimationFrame(draw);
        };
        resize();
        window.addEventListener('resize', resize);
        animationFrame = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', resize);
            clearGroup(drawGroup);
            controls.dispose();
            spriteGeometry.dispose();
            spriteTexture.dispose();
            renderer.dispose();
            container.replaceChildren();
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
        dashedLines,
        dashLength,
        dashGap,
        threeCameraMode,
        threeLineRenderMode,
        maxTrailPointsPerLayer,
        adaptiveQuality,
        maxAdaptiveStep,
    ]);
}
