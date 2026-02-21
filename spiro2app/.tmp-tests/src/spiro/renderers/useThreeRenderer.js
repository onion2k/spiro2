import { useEffect } from 'react';
import { BufferAttribute, BufferGeometry, Color, Group, OrthographicCamera, Points, PointsMaterial, Scene, WebGLRenderer, } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { buildLineOffsets, buildSymmetryVariants, colorForPoint, createRuntimeState, lineWidthForPoint, stepRuntime, } from './runtime';
export function useThreeRenderer(options) {
    const { containerRef, enabled, layers, compiledLayers, isPaused, resetTick, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, amplitudeMod, frequencyMod, phaseMod, noiseMode, noiseAmount, noiseFrequency, noiseSpeed, noiseOctaves, noiseSeed, strokeWidthMode, baseLineWidth, lineWidthBoost, dashedLines, dashLength, dashGap, maxTrailPointsPerLayer, adaptiveQuality, maxAdaptiveStep, } = options;
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
        const camera = new OrthographicCamera();
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
        const disposeObject = (child) => {
            const renderObject = child;
            if (renderObject.geometry) {
                renderObject.geometry.dispose();
            }
            if (Array.isArray(renderObject.material)) {
                for (const material of renderObject.material) {
                    material.dispose();
                }
            }
            else if (renderObject.material) {
                renderObject.material.dispose();
            }
        };
        const resize = () => {
            const width = Math.max(1, container.clientWidth);
            const height = Math.max(1, container.clientHeight);
            renderer.setSize(width, height, false);
            camera.left = -width / 2;
            camera.right = width / 2;
            camera.top = height / 2;
            camera.bottom = -height / 2;
            camera.near = 0.1;
            camera.far = Math.max(width, height) * 20;
            if (!userInteracted) {
                camera.position.set(0, 0, Math.max(width, height) * 1.25);
                controls.target.set(0, 0, 0);
            }
            camera.updateProjectionMatrix();
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
            while (drawGroup.children.length > 0) {
                const child = drawGroup.children[drawGroup.children.length - 1];
                if (!child) {
                    break;
                }
                drawGroup.remove(child);
                disposeObject(child);
            }
            for (const runtimeLayer of runtime.runtimeLayers) {
                const layer = runtimeLayer.layer;
                if (!layer.visible || runtimeLayer.trail.length === 0) {
                    continue;
                }
                const step = runtimeLayer.trail.length > 3000 ? Math.ceil(runtimeLayer.trail.length / 3000) : 1;
                const shouldDrawLines = layer.drawMode === 'lines' || layer.drawMode === 'lines-points';
                const shouldDrawPoints = layer.drawMode === 'points' || layer.drawMode === 'lines-points';
                if (shouldDrawLines) {
                    const widthRange = Math.max(0, lineWidthBoost);
                    const bucketCount = widthRange > 0.001 ? 5 : 1;
                    const bucketPositions = Array.from({ length: bucketCount }, () => []);
                    const bucketColors = Array.from({ length: bucketCount }, () => []);
                    for (let i = Math.max(step, 1); i < runtimeLayer.trail.length; i += step) {
                        const current = runtimeLayer.trail[i];
                        if (!current.connected) {
                            continue;
                        }
                        const prior = runtimeLayer.trail[i - step];
                        const fromOffsets = buildLineOffsets(layer, prior.index, runtimeLayer.paramU);
                        const toOffsets = buildLineOffsets(layer, current.index, runtimeLayer.paramU);
                        const linePairs = Math.min(fromOffsets.length, toOffsets.length);
                        const style = colorForPoint(current, layer, nowSec);
                        const rgb = new Color(`hsl(${style.hue}, 90%, 70%)`);
                        const computedWidth = lineWidthForPoint(current, strokeWidthMode, baseLineWidth, lineWidthBoost);
                        const bucketIndex = bucketCount === 1
                            ? 0
                            : Math.max(0, Math.min(bucketCount - 1, Math.round(((computedWidth - baseLineWidth) / Math.max(0.001, widthRange)) * (bucketCount - 1))));
                        const linePositions = bucketPositions[bucketIndex];
                        const lineColors = bucketColors[bucketIndex];
                        for (let line = 0; line < linePairs; line += 1) {
                            const from = buildSymmetryVariants({ x: prior.x + fromOffsets[line].x, y: prior.y + fromOffsets[line].y }, center, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
                            const to = buildSymmetryVariants({ x: current.x + toOffsets[line].x, y: current.y + toOffsets[line].y }, center, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
                            const pairs = Math.min(from.length, to.length);
                            for (let pair = 0; pair < pairs; pair += 1) {
                                linePositions.push(from[pair].x - center.x, center.y - from[pair].y, 0);
                                linePositions.push(to[pair].x - center.x, center.y - to[pair].y, 0);
                                lineColors.push(rgb.r, rgb.g, rgb.b);
                                lineColors.push(rgb.r, rgb.g, rgb.b);
                            }
                        }
                    }
                    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
                        if (bucketPositions[bucket].length === 0) {
                            continue;
                        }
                        const widthFactor = bucketCount === 1 ? 0 : bucket / (bucketCount - 1);
                        const linePixelWidth = baseLineWidth + widthRange * widthFactor;
                        const lineGeometry = new LineSegmentsGeometry();
                        lineGeometry.setPositions(bucketPositions[bucket]);
                        lineGeometry.setColors(bucketColors[bucket]);
                        const lineMaterial = new LineMaterial({
                            color: 0xffffff,
                            linewidth: Math.max(0.5, linePixelWidth),
                            vertexColors: true,
                            transparent: true,
                            opacity: 0.95,
                            dashed: dashedLines,
                            dashSize: Math.max(1, dashLength),
                            gapSize: Math.max(0, dashGap),
                        });
                        lineMaterial.resolution.set(width, height);
                        const fatLine = new LineSegments2(lineGeometry, lineMaterial);
                        if (dashedLines) {
                            fatLine.computeLineDistances();
                        }
                        drawGroup.add(fatLine);
                    }
                }
                if (shouldDrawPoints) {
                    const pointPositions = [];
                    const pointColors = [];
                    for (let i = 0; i < runtimeLayer.trail.length; i += step) {
                        const point = runtimeLayer.trail[i];
                        const offsets = buildLineOffsets(layer, point.index, runtimeLayer.paramU);
                        const style = colorForPoint(point, layer, nowSec);
                        const rgb = new Color(`hsl(${style.hue}, 95%, 72%)`);
                        for (const offset of offsets) {
                            const copies = buildSymmetryVariants({ x: point.x + offset.x, y: point.y + offset.y }, center, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
                            for (const copy of copies) {
                                pointPositions.push(copy.x - center.x, center.y - copy.y, 0);
                                pointColors.push(rgb.r, rgb.g, rgb.b);
                            }
                        }
                    }
                    if (pointPositions.length > 0) {
                        const pointGeometry = new BufferGeometry();
                        pointGeometry.setAttribute('position', new BufferAttribute(new Float32Array(pointPositions), 3));
                        pointGeometry.setAttribute('color', new BufferAttribute(new Float32Array(pointColors), 3));
                        const pointMaterial = new PointsMaterial({
                            size: Math.max(1, layer.pointSize * 2),
                            sizeAttenuation: false,
                            vertexColors: true,
                            transparent: true,
                            opacity: 0.9,
                        });
                        drawGroup.add(new Points(pointGeometry, pointMaterial));
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
            while (drawGroup.children.length > 0) {
                const child = drawGroup.children[drawGroup.children.length - 1];
                if (!child) {
                    break;
                }
                drawGroup.remove(child);
                disposeObject(child);
            }
            controls.dispose();
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
        maxTrailPointsPerLayer,
        adaptiveQuality,
        maxAdaptiveStep,
    ]);
}
