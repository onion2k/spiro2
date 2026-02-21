import { useEffect } from 'react';
import { buildLineOffsets, buildSymmetryVariants, colorForPoint, createRuntimeState, lineWidthForPoint, stepRuntime, } from './runtime';
export function useSvgRenderer(options) {
    const { svgRef, enabled, layers, compiledLayers, isPaused, resetTick, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, amplitudeMod, frequencyMod, phaseMod, noiseMode, noiseAmount, noiseFrequency, noiseSpeed, noiseOctaves, noiseSeed, strokeWidthMode, baseLineWidth, lineWidthBoost, dashedLines, dashLength, dashGap, glowAmount, maxTrailPointsPerLayer, adaptiveQuality, maxAdaptiveStep, } = options;
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const svg = svgRef.current;
        if (!svg) {
            return;
        }
        const svgNs = 'http://www.w3.org/2000/svg';
        svg.replaceChildren();
        const defs = document.createElementNS(svgNs, 'defs');
        const glowFilter = document.createElementNS(svgNs, 'filter');
        glowFilter.setAttribute('id', 'spiro-svg-glow');
        const blur = document.createElementNS(svgNs, 'feGaussianBlur');
        blur.setAttribute('stdDeviation', '2');
        blur.setAttribute('result', 'blur');
        glowFilter.appendChild(blur);
        defs.appendChild(glowFilter);
        svg.appendChild(defs);
        const layersGroup = document.createElementNS(svgNs, 'g');
        svg.appendChild(layersGroup);
        const runtime = createRuntimeState(layers, compiledLayers);
        let animationFrame = 0;
        const draw = (timeMs) => {
            const width = Math.max(1, svg.clientWidth);
            const height = Math.max(1, svg.clientHeight);
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
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
            const fragment = document.createDocumentFragment();
            const maxElements = 8000;
            let elementCount = 0;
            for (const runtimeLayer of runtime.runtimeLayers) {
                const layer = runtimeLayer.layer;
                if (!layer.visible || runtimeLayer.trail.length === 0) {
                    continue;
                }
                const layerGroup = document.createElementNS(svgNs, 'g');
                fragment.appendChild(layerGroup);
                const step = runtimeLayer.trail.length > 2500 ? Math.ceil(runtimeLayer.trail.length / 2500) : 1;
                const shouldDrawLines = layer.drawMode === 'lines' || layer.drawMode === 'lines-points';
                const shouldDrawPoints = layer.drawMode === 'points' || layer.drawMode === 'lines-points';
                if (shouldDrawLines) {
                    for (let i = Math.max(step, 1); i < runtimeLayer.trail.length; i += step) {
                        if (elementCount >= maxElements) {
                            break;
                        }
                        const current = runtimeLayer.trail[i];
                        if (!current.connected) {
                            continue;
                        }
                        const prior = runtimeLayer.trail[i - step];
                        const color = colorForPoint(current, layer, nowSec);
                        const strokeWidth = lineWidthForPoint(current, strokeWidthMode, baseLineWidth, lineWidthBoost);
                        const fromOffsets = buildLineOffsets(layer, prior.index, runtimeLayer.paramU);
                        const toOffsets = buildLineOffsets(layer, current.index, runtimeLayer.paramU);
                        const linePairs = Math.min(fromOffsets.length, toOffsets.length);
                        for (let line = 0; line < linePairs; line += 1) {
                            const from = buildSymmetryVariants({ x: prior.x + fromOffsets[line].x, y: prior.y + fromOffsets[line].y }, center, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
                            const to = buildSymmetryVariants({ x: current.x + toOffsets[line].x, y: current.y + toOffsets[line].y }, center, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
                            const pairs = Math.min(from.length, to.length);
                            for (let pair = 0; pair < pairs; pair += 1) {
                                if (elementCount >= maxElements) {
                                    break;
                                }
                                const lineEl = document.createElementNS(svgNs, 'line');
                                lineEl.setAttribute('x1', `${from[pair].x}`);
                                lineEl.setAttribute('y1', `${from[pair].y}`);
                                lineEl.setAttribute('x2', `${to[pair].x}`);
                                lineEl.setAttribute('y2', `${to[pair].y}`);
                                lineEl.setAttribute('stroke', `hsl(${color.hue} 90% 70%)`);
                                lineEl.setAttribute('stroke-opacity', `${color.alpha}`);
                                lineEl.setAttribute('stroke-width', `${strokeWidth}`);
                                lineEl.setAttribute('stroke-linecap', 'round');
                                lineEl.setAttribute('stroke-linejoin', 'round');
                                if (dashedLines) {
                                    lineEl.setAttribute('stroke-dasharray', `${dashLength} ${dashGap}`);
                                }
                                if (glowAmount > 0) {
                                    lineEl.setAttribute('filter', 'url(#spiro-svg-glow)');
                                }
                                layerGroup.appendChild(lineEl);
                                elementCount += 1;
                            }
                        }
                    }
                }
                if (shouldDrawPoints) {
                    for (let i = 0; i < runtimeLayer.trail.length; i += step) {
                        if (elementCount >= maxElements) {
                            break;
                        }
                        const point = runtimeLayer.trail[i];
                        const color = colorForPoint(point, layer, nowSec);
                        const offsets = buildLineOffsets(layer, point.index, runtimeLayer.paramU);
                        for (const offset of offsets) {
                            const copies = buildSymmetryVariants({ x: point.x + offset.x, y: point.y + offset.y }, center, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
                            for (const copy of copies) {
                                if (elementCount >= maxElements) {
                                    break;
                                }
                                const pointEl = document.createElementNS(svgNs, 'circle');
                                pointEl.setAttribute('cx', `${copy.x}`);
                                pointEl.setAttribute('cy', `${copy.y}`);
                                pointEl.setAttribute('r', `${layer.pointSize}`);
                                pointEl.setAttribute('fill', `hsl(${color.hue} 95% 72%)`);
                                pointEl.setAttribute('fill-opacity', `${Math.max(0.08, color.alpha)}`);
                                layerGroup.appendChild(pointEl);
                                elementCount += 1;
                            }
                        }
                    }
                }
            }
            layersGroup.replaceChildren(fragment);
            animationFrame = requestAnimationFrame(draw);
        };
        animationFrame = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animationFrame);
            svg.replaceChildren();
        };
    }, [
        svgRef,
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
