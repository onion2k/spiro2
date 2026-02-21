import { useEffect } from 'react';
import { clamp01, interpolateHue, rotatePoint } from '../math';
import { fbmNoise2D, hashNoise2D } from '../noise';
import { PALETTES } from '../constants';
export function useCanvas2DRenderer(options) {
    const { canvasRef, enabled, layers, compiledLayers, isPaused, resetTick, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, amplitudeMod, frequencyMod, phaseMod, noiseMode, noiseAmount, noiseFrequency, noiseSpeed, noiseOctaves, noiseSeed, strokeWidthMode, baseLineWidth, lineWidthBoost, dashedLines, dashLength, dashGap, glowAmount, maxTrailPointsPerLayer, adaptiveQuality, maxAdaptiveStep, } = options;
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        const staticCanvas = document.createElement('canvas');
        const staticContext = staticCanvas.getContext('2d');
        if (!staticContext) {
            return;
        }
        const compiledMap = new Map(compiledLayers.map((entry) => [entry.id, entry.fn]));
        const runtimeLayers = layers.map((layer) => ({
            layer,
            fn: compiledMap.get(layer.id) ?? null,
            paramT: 0,
            paramU: 0,
            previous: null,
            previousAngle: null,
            trail: [],
            pointIndex: 0,
            sampleCounter: 0,
            bakedPointCount: 0,
        }));
        let prevTime = 0;
        let fpsEma = 60;
        let sampleStride = 1;
        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = Math.floor(canvas.clientWidth * dpr);
            const height = Math.floor(canvas.clientHeight * dpr);
            const mainChanged = canvas.width !== width || canvas.height !== height;
            const staticChanged = staticCanvas.width !== width || staticCanvas.height !== height;
            if (mainChanged) {
                canvas.width = width;
                canvas.height = height;
            }
            if (staticChanged) {
                staticCanvas.width = width;
                staticCanvas.height = height;
            }
            if (mainChanged || staticChanged) {
                context.fillStyle = '#020617';
                context.fillRect(0, 0, width, height);
                staticContext.fillStyle = '#020617';
                staticContext.fillRect(0, 0, width, height);
                for (const runtime of runtimeLayers) {
                    runtime.previous = null;
                    runtime.previousAngle = null;
                    runtime.trail = [];
                    runtime.sampleCounter = 0;
                    runtime.bakedPointCount = 0;
                }
            }
        };
        const buildSymmetryVariants = (point, center) => {
            const variants = [];
            const repeats = Math.max(1, rotationalRepeats);
            const offsetRad = (rotationOffsetDeg * Math.PI) / 180;
            for (let i = 0; i < repeats; i += 1) {
                const angle = offsetRad + (i / repeats) * Math.PI * 2;
                const rotated = rotatePoint(point, center, angle);
                const baseVariants = [rotated];
                if (mirrorX) {
                    baseVariants.push({ x: center.x * 2 - rotated.x, y: rotated.y });
                }
                if (mirrorY) {
                    baseVariants.push({ x: rotated.x, y: center.y * 2 - rotated.y });
                }
                if (mirrorX && mirrorY) {
                    baseVariants.push({ x: center.x * 2 - rotated.x, y: center.y * 2 - rotated.y });
                }
                for (const variant of baseVariants) {
                    variants.push(variant);
                }
            }
            return variants;
        };
        const buildLineOffsets = (layer, pointIndex, paramU) => {
            const count = Math.max(1, Math.min(16, Math.round(layer.multiLineCount)));
            const spread = Math.max(0, layer.multiLineSpread);
            if (count === 1 || spread === 0) {
                return [{ x: 0, y: 0 }];
            }
            const normalizedPhaseStep = (0.08 * layer.multiLineMotionSpeed) / Math.max(0.15, Math.abs(layer.speed));
            const baseOrbitPhase = paramU * 0.6 + pointIndex * normalizedPhaseStep;
            let globalPhase = 0;
            if (layer.multiLineMotion === 'orbit') {
                globalPhase = baseOrbitPhase;
            }
            else if (layer.multiLineMotion === 'random') {
                // Random mode jitters the whole ring, while preserving equal angular spacing.
                globalPhase = Math.sin(pointIndex * 0.071 + baseOrbitPhase * 0.83) * Math.PI;
            }
            const offsets = [];
            for (let i = 0; i < count; i += 1) {
                const angle = (i / count) * Math.PI * 2 + globalPhase;
                offsets.push({
                    x: Math.cos(angle) * spread,
                    y: Math.sin(angle) * spread,
                });
            }
            return offsets;
        };
        const colorForPoint = (point, layer, nowSec) => {
            const palette = PALETTES[layer.paletteId];
            const ageRatio = layer.lineForever ? 0 : clamp01((nowSec - point.drawnAt) / layer.lineLifetime);
            const alpha = layer.lineForever ? 1 : Math.max(0.06, 1 - ageRatio);
            let hue = point.hue;
            if (layer.colorMode === 'palette') {
                hue = interpolateHue(palette, (point.index % 120) / 120);
            }
            else if (layer.colorMode === 'age') {
                hue = interpolateHue(palette, ageRatio);
            }
            else if (layer.colorMode === 'speed') {
                hue = interpolateHue(palette, point.speedNorm);
            }
            else if (layer.colorMode === 'curvature') {
                hue = interpolateHue(palette, point.curvatureNorm);
            }
            if (layer.hueLock) {
                hue = layer.baseHue;
            }
            return { hue, alpha };
        };
        const drawLayerRange = (targetContext, runtime, nowSec, center, startIndex, endIndex) => {
            const layer = runtime.layer;
            if (!layer.visible || endIndex <= startIndex) {
                return;
            }
            const shouldDrawLines = layer.drawMode === 'lines' || layer.drawMode === 'lines-points';
            const shouldDrawPoints = layer.drawMode === 'points' || layer.drawMode === 'lines-points';
            if (shouldDrawLines) {
                targetContext.lineCap = 'round';
                targetContext.lineJoin = 'round';
                targetContext.setLineDash(dashedLines ? [dashLength, dashGap] : []);
                targetContext.shadowBlur = glowAmount;
                for (let i = Math.max(1, startIndex); i < endIndex; i += 1) {
                    const current = runtime.trail[i];
                    if (!current.connected) {
                        continue;
                    }
                    const prior = runtime.trail[i - 1];
                    const color = colorForPoint(current, layer, nowSec);
                    targetContext.strokeStyle = `hsla(${color.hue} 90% 70% / ${color.alpha})`;
                    targetContext.shadowColor = `hsla(${color.hue} 90% 60% / ${Math.min(0.85, color.alpha)})`;
                    let metric = 0;
                    if (strokeWidthMode === 'speed') {
                        metric = current.speedNorm;
                    }
                    else if (strokeWidthMode === 'curvature') {
                        metric = current.curvatureNorm;
                    }
                    targetContext.lineWidth = baseLineWidth + lineWidthBoost * metric;
                    const fromOffsets = buildLineOffsets(layer, prior.index, runtime.paramU);
                    const toOffsets = buildLineOffsets(layer, current.index, runtime.paramU);
                    const linePairs = Math.min(fromOffsets.length, toOffsets.length);
                    for (let line = 0; line < linePairs; line += 1) {
                        const from = buildSymmetryVariants({ x: prior.x + fromOffsets[line].x, y: prior.y + fromOffsets[line].y }, center);
                        const to = buildSymmetryVariants({ x: current.x + toOffsets[line].x, y: current.y + toOffsets[line].y }, center);
                        const pairs = Math.min(from.length, to.length);
                        for (let pair = 0; pair < pairs; pair += 1) {
                            targetContext.beginPath();
                            targetContext.moveTo(from[pair].x, from[pair].y);
                            targetContext.lineTo(to[pair].x, to[pair].y);
                            targetContext.stroke();
                        }
                    }
                }
                targetContext.setLineDash([]);
                targetContext.shadowBlur = 0;
            }
            if (shouldDrawPoints) {
                targetContext.shadowBlur = 0;
                for (let i = startIndex; i < endIndex; i += 1) {
                    const point = runtime.trail[i];
                    const color = colorForPoint(point, layer, nowSec);
                    targetContext.fillStyle = `hsla(${color.hue} 95% 72% / ${Math.max(0.08, color.alpha)})`;
                    const offsets = buildLineOffsets(layer, point.index, runtime.paramU);
                    for (const offset of offsets) {
                        const copies = buildSymmetryVariants({ x: point.x + offset.x, y: point.y + offset.y }, center);
                        for (const copy of copies) {
                            targetContext.beginPath();
                            targetContext.arc(copy.x, copy.y, layer.pointSize, 0, Math.PI * 2);
                            targetContext.fill();
                        }
                    }
                }
            }
        };
        const draw = (timeMs) => {
            resizeCanvas();
            const width = canvas.width;
            const height = canvas.height;
            const dt = prevTime === 0 ? 0 : (timeMs - prevTime) / 1000;
            const nowSec = timeMs / 1000;
            const center = { x: width / 2, y: height / 2 };
            prevTime = timeMs;
            if (dt > 0) {
                const fps = 1 / dt;
                fpsEma = fpsEma * 0.9 + fps * 0.1;
                if (adaptiveQuality) {
                    if (fpsEma < 24) {
                        sampleStride = Math.min(Math.max(1, maxAdaptiveStep), sampleStride + 1);
                    }
                    else if (fpsEma > 50) {
                        sampleStride = Math.max(1, sampleStride - 1);
                    }
                }
                else {
                    sampleStride = 1;
                }
            }
            for (const runtime of runtimeLayers) {
                const layer = runtime.layer;
                if (runtime.fn && !isPaused && layer.visible) {
                    runtime.paramT += dt * layer.speed;
                    runtime.paramU += dt * layer.uSpeed;
                    runtime.sampleCounter += 1;
                    if (runtime.sampleCounter % sampleStride === 0) {
                        const modulationPhase = runtime.paramU * 0.83 + Math.sin(runtime.paramT * 0.17);
                        const modT = (runtime.paramT + phaseMod * Math.sin(modulationPhase)) *
                            (1 + frequencyMod * Math.sin(runtime.paramU * 0.71));
                        const modU = (runtime.paramU + phaseMod * 0.35 * Math.cos(runtime.paramT * 0.29)) *
                            (1 + frequencyMod * 0.35 * Math.sin(runtime.paramT * 0.23));
                        const point = runtime.fn(modT, modU, layer.R, layer.r, layer.d);
                        if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
                            const amplitudeScaleX = 1 + amplitudeMod * Math.sin(runtime.paramU * 0.91);
                            const amplitudeScaleY = 1 + amplitudeMod * Math.cos(runtime.paramU * 0.73);
                            const nx = modT * noiseFrequency + runtime.paramT * noiseSpeed;
                            const ny = modU * noiseFrequency + runtime.paramU * noiseSpeed;
                            const octaves = Math.max(1, Math.min(6, Math.round(noiseOctaves)));
                            let wobbleX = 0;
                            let wobbleY = 0;
                            if (noiseMode === 'grain') {
                                wobbleX = (hashNoise2D(nx, ny, noiseSeed) - 0.5) * 2 * noiseAmount;
                                wobbleY =
                                    (hashNoise2D(nx + 17.3, ny + 9.1, noiseSeed + 1.77) - 0.5) * 2 * noiseAmount;
                            }
                            else if (noiseMode === 'flow') {
                                wobbleX = fbmNoise2D(nx, ny, noiseSeed, octaves) * noiseAmount;
                                wobbleY = fbmNoise2D(nx + 19.2, ny + 7.6, noiseSeed + 2.03, octaves) * noiseAmount;
                            }
                            const modX = point.x * amplitudeScaleX + wobbleX;
                            const modY = point.y * amplitudeScaleY + wobbleY;
                            const maxRange = Math.max(1, Math.abs(layer.R - layer.r) + Math.abs(layer.d));
                            const scale = (Math.min(width, height) * 0.46) / maxRange;
                            const x = center.x + modX * scale;
                            const y = center.y + modY * scale;
                            let speedNorm = 0;
                            let curvatureNorm = 0;
                            if (runtime.previous && dt > 0) {
                                const dx = x - runtime.previous.x;
                                const dy = y - runtime.previous.y;
                                const distance = Math.hypot(dx, dy);
                                speedNorm = clamp01(distance / (Math.min(width, height) * 0.04));
                                const angle = Math.atan2(dy, dx);
                                if (runtime.previousAngle !== null) {
                                    const turn = Math.atan2(Math.sin(angle - runtime.previousAngle), Math.cos(angle - runtime.previousAngle));
                                    curvatureNorm = clamp01(Math.abs(turn) / Math.PI);
                                }
                                runtime.previousAngle = angle;
                            }
                            else {
                                runtime.previousAngle = null;
                            }
                            runtime.trail.push({
                                x,
                                y,
                                drawnAt: nowSec,
                                hue: (runtime.paramT * 40) % 360,
                                connected: runtime.previous !== null,
                                speedNorm,
                                curvatureNorm,
                                index: runtime.pointIndex,
                            });
                            runtime.pointIndex += 1;
                            runtime.previous = { x, y };
                        }
                        else {
                            runtime.previous = null;
                            runtime.previousAngle = null;
                        }
                    }
                }
                if (!layer.lineForever) {
                    const cutoff = nowSec - layer.lineLifetime;
                    let firstVisible = 0;
                    while (firstVisible < runtime.trail.length && runtime.trail[firstVisible].drawnAt < cutoff) {
                        firstVisible += 1;
                    }
                    if (firstVisible > 0) {
                        runtime.trail = runtime.trail.slice(firstVisible);
                        if (runtime.trail.length > 0) {
                            runtime.trail[0].connected = false;
                        }
                        else {
                            runtime.previous = null;
                            runtime.previousAngle = null;
                        }
                    }
                }
                if (runtime.trail.length > maxTrailPointsPerLayer) {
                    const trim = runtime.trail.length - maxTrailPointsPerLayer;
                    runtime.trail = runtime.trail.slice(trim);
                    if (runtime.trail.length > 0) {
                        runtime.trail[0].connected = false;
                    }
                }
            }
            let rebuildStatic = false;
            for (const runtime of runtimeLayers) {
                if (runtime.layer.lineForever && runtime.trail.length < runtime.bakedPointCount) {
                    rebuildStatic = true;
                    break;
                }
            }
            if (rebuildStatic) {
                staticContext.fillStyle = '#020617';
                staticContext.fillRect(0, 0, width, height);
                for (const runtime of runtimeLayers) {
                    runtime.bakedPointCount = 0;
                }
            }
            for (const runtime of runtimeLayers) {
                if (!runtime.layer.lineForever || !runtime.layer.visible) {
                    continue;
                }
                const startIndex = runtime.bakedPointCount;
                const endIndex = runtime.trail.length;
                if (endIndex > startIndex) {
                    drawLayerRange(staticContext, runtime, nowSec, center, startIndex, endIndex);
                    runtime.bakedPointCount = endIndex;
                }
            }
            context.fillStyle = '#020617';
            context.fillRect(0, 0, width, height);
            context.drawImage(staticCanvas, 0, 0);
            for (const runtime of runtimeLayers) {
                const layer = runtime.layer;
                if (!layer.visible || layer.lineForever) {
                    continue;
                }
                drawLayerRange(context, runtime, nowSec, center, 0, runtime.trail.length);
            }
            animationFrame = requestAnimationFrame(draw);
        };
        resizeCanvas();
        context.fillStyle = '#020617';
        context.fillRect(0, 0, canvas.width, canvas.height);
        staticContext.fillStyle = '#020617';
        staticContext.fillRect(0, 0, staticCanvas.width, staticCanvas.height);
        let animationFrame = requestAnimationFrame(draw);
        window.addEventListener('resize', resizeCanvas);
        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [
        canvasRef,
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
        glowAmount,
        maxTrailPointsPerLayer,
        adaptiveQuality,
        maxAdaptiveStep,
    ]);
}
