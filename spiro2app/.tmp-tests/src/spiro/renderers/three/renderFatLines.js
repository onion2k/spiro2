import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshPhysicalMaterial, Vector3 } from 'three';
import { buildLineOffsets, createSymmetryTransforms2D, colorForPoint, getSmoothedTrail, lineWidthForPoint, tangentForTrail, } from '../runtime';
function createPhysicalRibbonMaterial(options) {
    const { lineMaterialColor, lineMaterialMetalness, lineMaterialRoughness, lineMaterialClearcoat, lineMaterialClearcoatRoughness, lineMaterialTransmission, lineMaterialThickness, lineMaterialIor, } = options;
    const baseColor = new Color(lineMaterialColor);
    const sheenColor = baseColor.clone().lerp(new Color('#ffffff'), 0.7);
    const transmission = Math.max(0, Math.min(1, lineMaterialTransmission));
    const isTransmissive = transmission > 0.001;
    return new MeshPhysicalMaterial({
        color: baseColor,
        vertexColors: true,
        side: DoubleSide,
        transparent: isTransmissive,
        opacity: 1,
        depthTest: true,
        depthWrite: !isTransmissive,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        metalness: Math.max(0, Math.min(1, lineMaterialMetalness)),
        roughness: Math.max(0, Math.min(1, lineMaterialRoughness)),
        clearcoat: Math.max(0, Math.min(1, lineMaterialClearcoat)),
        clearcoatRoughness: Math.max(0, Math.min(1, lineMaterialClearcoatRoughness)),
        transmission,
        thickness: Math.max(0, lineMaterialThickness),
        ior: Math.max(1, Math.min(2.333, lineMaterialIor)),
        sheen: 0.9,
        sheenColor,
        sheenRoughness: Math.max(0.08, Math.min(1, lineMaterialRoughness * 0.65)),
        specularIntensity: 1,
    });
}
function updatePhysicalRibbonMaterial(material, options) {
    const { lineMaterialColor, lineMaterialMetalness, lineMaterialRoughness, lineMaterialClearcoat, lineMaterialClearcoatRoughness, lineMaterialTransmission, lineMaterialThickness, lineMaterialIor, } = options;
    const baseColor = new Color(lineMaterialColor);
    const sheenColor = baseColor.clone().lerp(new Color('#ffffff'), 0.7);
    const transmission = Math.max(0, Math.min(1, lineMaterialTransmission));
    const isTransmissive = transmission > 0.001;
    material.color.copy(baseColor);
    material.sheenColor = sheenColor;
    material.transparent = isTransmissive;
    material.depthWrite = !isTransmissive;
    material.metalness = Math.max(0, Math.min(1, lineMaterialMetalness));
    material.roughness = Math.max(0, Math.min(1, lineMaterialRoughness));
    material.clearcoat = Math.max(0, Math.min(1, lineMaterialClearcoat));
    material.clearcoatRoughness = Math.max(0, Math.min(1, lineMaterialClearcoatRoughness));
    material.transmission = transmission;
    material.thickness = Math.max(0, lineMaterialThickness);
    material.ior = Math.max(1, Math.min(2.333, lineMaterialIor));
    material.sheenRoughness = Math.max(0.08, Math.min(1, lineMaterialRoughness * 0.65));
    material.needsUpdate = true;
}
function buildRibbonGeometry(strip, lineWidth) {
    const pointCount = Math.floor(strip.positions.length / 3);
    if (pointCount < 2) {
        return null;
    }
    const halfWidth = Math.max(0.25, lineWidth * 0.5);
    const upA = new Vector3(0, 0, 1);
    const upB = new Vector3(0, 1, 0);
    const pPrev = new Vector3();
    const pCurr = new Vector3();
    const pNext = new Vector3();
    const tangent = new Vector3();
    const side = new Vector3();
    const cumulativeLength = new Array(pointCount);
    cumulativeLength[0] = 0;
    let totalLength = 0;
    for (let i = 1; i < pointCount; i += 1) {
        const ix = i * 3;
        const px = (i - 1) * 3;
        const segment = Math.hypot(strip.positions[ix] - strip.positions[px], strip.positions[ix + 1] - strip.positions[px + 1], strip.positions[ix + 2] - strip.positions[px + 2]);
        totalLength += segment;
        cumulativeLength[i] = totalLength;
    }
    const vertices = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i < pointCount; i += 1) {
        const ci = i * 3;
        const pi = Math.max(0, i - 1) * 3;
        const ni = Math.min(pointCount - 1, i + 1) * 3;
        pCurr.set(strip.positions[ci], strip.positions[ci + 1], strip.positions[ci + 2]);
        pPrev.set(strip.positions[pi], strip.positions[pi + 1], strip.positions[pi + 2]);
        pNext.set(strip.positions[ni], strip.positions[ni + 1], strip.positions[ni + 2]);
        tangent.subVectors(pNext, pPrev);
        if (tangent.lengthSq() < 1e-8) {
            tangent.set(1, 0, 0);
        }
        else {
            tangent.normalize();
        }
        side.crossVectors(tangent, upA);
        if (side.lengthSq() < 1e-8) {
            side.crossVectors(tangent, upB);
        }
        side.normalize().multiplyScalar(halfWidth);
        const left = pCurr.clone().add(side);
        const right = pCurr.clone().sub(side);
        vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);
        const cr = strip.colors[ci];
        const cg = strip.colors[ci + 1];
        const cb = strip.colors[ci + 2];
        colors.push(cr, cg, cb, cr, cg, cb);
        const u = totalLength > 1e-5 ? cumulativeLength[i] / totalLength : i / Math.max(1, pointCount - 1);
        uvs.push(u, 0, u, 1);
        if (i < pointCount - 1) {
            const a = i * 2;
            const b = a + 1;
            const c = a + 2;
            const d = a + 3;
            indices.push(a, c, b, c, d, b);
        }
    }
    if (indices.length === 0) {
        return null;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}
function buildRibbonMesh(strip, lineWidth, material, existingMesh) {
    const geometry = buildRibbonGeometry(strip, lineWidth);
    if (!geometry) {
        return null;
    }
    if (existingMesh) {
        const previousGeometry = existingMesh.geometry;
        previousGeometry.dispose();
        existingMesh.geometry = geometry;
        existingMesh.material = material;
        return existingMesh;
    }
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    return mesh;
}
function hashTrackKey(trackKey) {
    let hash = 2166136261;
    for (let i = 0; i < trackKey.length; i += 1) {
        hash ^= trackKey.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function trackDepthBias(trackKey) {
    const normalized = (hashTrackKey(trackKey) % 1024) / 1023;
    return (normalized - 0.5) * 0.9;
}
export function renderFatLines(options) {
    const { runtimeLayer, center, nowSec, step, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, strokeWidthMode, baseLineWidth, lineWidthBoost, trailSmoothing, dashedLines, dashLength, dashGap, lineMaterialColor, lineMaterialMetalness, lineMaterialRoughness, lineMaterialClearcoat, lineMaterialClearcoatRoughness, lineMaterialTransmission, lineMaterialThickness, lineMaterialIor, existingMeshes = [], existingMaterial, } = options;
    const layer = runtimeLayer.layer;
    const widthRange = Math.max(0, lineWidthBoost);
    const bucketCount = widthRange > 0.001 ? 5 : 1;
    const materialOptions = {
        lineMaterialColor,
        lineMaterialMetalness,
        lineMaterialRoughness,
        lineMaterialClearcoat,
        lineMaterialClearcoatRoughness,
        lineMaterialTransmission,
        lineMaterialThickness,
        lineMaterialIor,
    };
    const sharedMaterial = existingMaterial ?? createPhysicalRibbonMaterial(materialOptions);
    if (existingMaterial) {
        updatePhysicalRibbonMaterial(existingMaterial, materialOptions);
    }
    const bucketTracks = Array.from({ length: bucketCount }, () => new Map());
    const previousBucketByTrack = new Map();
    const depthBiasByTrack = new Map();
    const dashCycle = Math.max(1, dashLength + dashGap);
    const smoothedTrail = getSmoothedTrail(runtimeLayer, trailSmoothing);
    const symmetryTransforms = createSymmetryTransforms2D({ x: center.x, y: center.y }, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
    const hueColor = new Color();
    for (let i = 0; i < smoothedTrail.length; i += Math.max(1, step)) {
        const current = smoothedTrail[i];
        if (!current) {
            continue;
        }
        const tangent = tangentForTrail(smoothedTrail, i, step);
        const offsets = buildLineOffsets(layer, current.index, runtimeLayer.paramU, tangent);
        const linePairs = offsets.length;
        const style = colorForPoint(current, layer, nowSec);
        const normalizedHue = (((style.hue % 360) + 360) % 360) / 360;
        hueColor.setHSL(normalizedHue, 0.9, 0.7);
        const computedWidth = lineWidthForPoint(current, strokeWidthMode, baseLineWidth, lineWidthBoost);
        const bucketIndex = bucketCount === 1
            ? 0
            : Math.max(0, Math.min(bucketCount - 1, Math.round(((computedWidth - baseLineWidth) / Math.max(0.001, widthRange)) * (bucketCount - 1))));
        for (let line = 0; line < linePairs; line += 1) {
            const sourceX = current.x + offsets[line].x;
            const sourceY = current.y + offsets[line].y;
            const sourceZ = current.z + offsets[line].z;
            for (let pair = 0; pair < symmetryTransforms.length; pair += 1) {
                const transform = symmetryTransforms[pair];
                const transformedX = sourceX * transform.xAxisX + sourceY * transform.yAxisX + transform.offsetX;
                const transformedY = sourceX * transform.xAxisY + sourceY * transform.yAxisY + transform.offsetY;
                const trackKey = `${line}:${pair}`;
                const wasBucket = previousBucketByTrack.get(trackKey);
                const dashPhase = ((current.index % dashCycle) + dashCycle) % dashCycle;
                const inDash = !dashedLines || dashPhase <= dashLength;
                const shouldBreak = !current.connected || !inDash || wasBucket === undefined || wasBucket !== bucketIndex;
                const bucketTrackMap = bucketTracks[bucketIndex];
                let track = bucketTrackMap.get(trackKey);
                if (!track) {
                    track = { positions: [], colors: [], strips: [] };
                    bucketTrackMap.set(trackKey, track);
                }
                if (shouldBreak && track.positions.length >= 6) {
                    track.strips.push({ positions: track.positions, colors: track.colors });
                    track.positions = [];
                    track.colors = [];
                }
                if (!inDash) {
                    previousBucketByTrack.delete(trackKey);
                    continue;
                }
                if (!depthBiasByTrack.has(trackKey)) {
                    depthBiasByTrack.set(trackKey, trackDepthBias(trackKey));
                }
                const zBias = depthBiasByTrack.get(trackKey) ?? 0;
                track.positions.push(transformedX - center.x, center.y - transformedY, sourceZ + zBias);
                track.colors.push(hueColor.r, hueColor.g, hueColor.b);
                previousBucketByTrack.set(trackKey, bucketIndex);
            }
        }
    }
    const nodes = [];
    let reuseMeshIndex = 0;
    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
        const widthFactor = bucketCount === 1 ? 0 : bucket / (bucketCount - 1);
        const lineWidth = baseLineWidth + widthRange * widthFactor;
        for (const track of bucketTracks[bucket].values()) {
            if (track.positions.length >= 6) {
                track.strips.push({ positions: track.positions, colors: track.colors });
            }
            for (const strip of track.strips) {
                const ribbonMesh = buildRibbonMesh(strip, lineWidth, sharedMaterial, existingMeshes[reuseMeshIndex]);
                if (ribbonMesh) {
                    nodes.push(ribbonMesh);
                    reuseMeshIndex += 1;
                }
            }
        }
    }
    if (nodes.length === 0 && !existingMaterial) {
        sharedMaterial.dispose();
    }
    else {
        // Share one material across strips; dispose once when clearing the first mesh.
        for (let i = 0; i < nodes.length; i += 1) {
            nodes[i].userData = { ...nodes[i].userData, skipMaterialDispose: i > 0 };
        }
    }
    return nodes;
}
