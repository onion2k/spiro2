import { AdditiveBlending, BufferAttribute, Color, DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, ShaderMaterial, } from 'three';
import { buildLineOffsets, createSymmetryTransforms2D, colorForPoint, getSmoothedTrail, lineWidthForPoint, tangentForTrail, } from '../runtime';
const MAX_SPRITE_COUNT = 20000;
const INITIAL_CAPACITY = 1024;
function clampSpriteSoftness(value) {
    return Math.max(0, Math.min(1, value));
}
function createSpriteGeometry(capacity) {
    const geometry = new InstancedBufferGeometry();
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2));
    const offsetAttr = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    const sizeAttr = new InstancedBufferAttribute(new Float32Array(capacity), 1);
    const colorAttr = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    offsetAttr.setUsage(DynamicDrawUsage);
    sizeAttr.setUsage(DynamicDrawUsage);
    colorAttr.setUsage(DynamicDrawUsage);
    geometry.setAttribute('instanceOffset', offsetAttr);
    geometry.setAttribute('instanceSize', sizeAttr);
    geometry.setAttribute('instanceColor', colorAttr);
    geometry.instanceCount = 0;
    return { geometry, offsetAttr, sizeAttr, colorAttr };
}
function createSpriteMaterial(texture, width, height, softness) {
    return new ShaderMaterial({
        uniforms: {
            map: { value: texture },
            opacity: { value: 0.9 },
            resolution: { value: { x: Math.max(1, width), y: Math.max(1, height) } },
            softness: { value: clampSpriteSoftness(softness) },
        },
        vertexShader: `
      attribute vec3 instanceOffset;
      attribute float instanceSize;
      attribute vec3 instanceColor;
      varying vec2 vUv;
      varying vec3 vColor;
      uniform vec2 resolution;

      void main() {
        vUv = uv;
        vColor = instanceColor;
        vec4 centerView = modelViewMatrix * vec4(instanceOffset, 1.0);
        vec4 clipPosition = projectionMatrix * centerView;
        vec2 ndcOffset = position.xy * instanceSize * 2.0 / resolution;
        clipPosition.xy += ndcOffset * clipPosition.w;
        gl_Position = clipPosition;
      }
    `,
        fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float softness;
      varying vec2 vUv;
      varying vec3 vColor;

      void main() {
        vec4 tex = texture2D(map, vUv);
        float easedAlpha = pow(tex.a, mix(2.2, 0.65, clamp(softness, 0.0, 1.0)));
        float alpha = easedAlpha * opacity;
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(vColor * tex.rgb, alpha);
      }
    `,
        transparent: true,
        blending: AdditiveBlending,
        toneMapped: false,
        side: DoubleSide,
        depthTest: false,
        depthWrite: false,
    });
}
function createSpriteMesh(texture, width, height, softness) {
    const { geometry, offsetAttr, sizeAttr, colorAttr } = createSpriteGeometry(INITIAL_CAPACITY);
    const material = createSpriteMaterial(texture, width, height, softness);
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.userData = {
        skipGeometryDispose: true,
        skipMaterialDispose: true,
        spriteInstanceCount: 0,
        capacity: INITIAL_CAPACITY,
        offsetAttr,
        sizeAttr,
        colorAttr,
    };
    return mesh;
}
function ensureCapacity(mesh, requiredCount) {
    if (requiredCount <= mesh.userData.capacity) {
        return;
    }
    let nextCapacity = mesh.userData.capacity;
    while (nextCapacity < requiredCount) {
        nextCapacity = Math.min(MAX_SPRITE_COUNT, nextCapacity * 2);
        if (nextCapacity === MAX_SPRITE_COUNT) {
            break;
        }
    }
    if (nextCapacity <= mesh.userData.capacity) {
        return;
    }
    const geometry = mesh.geometry;
    const oldOffsetAttr = mesh.userData.offsetAttr;
    const oldSizeAttr = mesh.userData.sizeAttr;
    const oldColorAttr = mesh.userData.colorAttr;
    const offsetAttr = new InstancedBufferAttribute(new Float32Array(nextCapacity * 3), 3);
    const sizeAttr = new InstancedBufferAttribute(new Float32Array(nextCapacity), 1);
    const colorAttr = new InstancedBufferAttribute(new Float32Array(nextCapacity * 3), 3);
    offsetAttr.setUsage(DynamicDrawUsage);
    sizeAttr.setUsage(DynamicDrawUsage);
    colorAttr.setUsage(DynamicDrawUsage);
    offsetAttr.array.set(oldOffsetAttr.array);
    sizeAttr.array.set(oldSizeAttr.array);
    colorAttr.array.set(oldColorAttr.array);
    geometry.setAttribute('instanceOffset', offsetAttr);
    geometry.setAttribute('instanceSize', sizeAttr);
    geometry.setAttribute('instanceColor', colorAttr);
    mesh.userData.capacity = nextCapacity;
    mesh.userData.offsetAttr = offsetAttr;
    mesh.userData.sizeAttr = sizeAttr;
    mesh.userData.colorAttr = colorAttr;
}
function updateMaterialUniforms(mesh, texture, width, height, softness) {
    mesh.material.uniforms.map.value = texture;
    mesh.material.uniforms.resolution.value.x = Math.max(1, width);
    mesh.material.uniforms.resolution.value.y = Math.max(1, height);
    mesh.material.uniforms.softness.value = clampSpriteSoftness(softness);
}
export function disposeSpriteBatchMesh(mesh) {
    mesh.geometry.dispose();
    mesh.material.dispose();
}
export function renderInstancedSprites(options) {
    const { runtimeLayer, center, nowSec, width, height, step, camera, spriteGeometry, spriteTexture, spriteSizeScale, spriteSoftness, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, strokeWidthMode, baseLineWidth, lineWidthBoost, trailSmoothing, dashedLines, dashLength, dashGap, existingMesh, } = options;
    void camera;
    void spriteGeometry;
    const layer = runtimeLayer.layer;
    const spritePositions = [];
    const spriteSizes = [];
    const spriteColors = [];
    const dashCycle = Math.max(1, dashLength + dashGap);
    const sizeScale = Math.max(0.1, spriteSizeScale);
    const smoothedTrail = getSmoothedTrail(runtimeLayer, trailSmoothing);
    const symmetryTransforms = createSymmetryTransforms2D({ x: center.x, y: center.y }, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
    const hueColor = new Color();
    for (let i = Math.max(step, 1); i < smoothedTrail.length; i += step) {
        const current = smoothedTrail[i];
        if (!current) {
            continue;
        }
        if (!current.connected) {
            continue;
        }
        if (dashedLines) {
            const phase = ((current.index % dashCycle) + dashCycle) % dashCycle;
            if (phase > dashLength) {
                continue;
            }
        }
        const tangent = tangentForTrail(smoothedTrail, i, step);
        const pointOffsets = buildLineOffsets(layer, current.index, runtimeLayer.paramU, tangent);
        const style = colorForPoint(current, layer, nowSec);
        const normalizedHue = (((style.hue % 360) + 360) % 360) / 360;
        hueColor.setHSL(normalizedHue, 0.9, 0.7);
        const spriteSize = Math.max(1.8, lineWidthForPoint(current, strokeWidthMode, baseLineWidth, lineWidthBoost) * 2 * sizeScale);
        for (const offset of pointOffsets) {
            const sourceX = current.x + offset.x;
            const sourceY = current.y + offset.y;
            const sourceZ = current.z + offset.z;
            for (let transformIndex = 0; transformIndex < symmetryTransforms.length; transformIndex += 1) {
                const transform = symmetryTransforms[transformIndex];
                const transformedX = sourceX * transform.xAxisX + sourceY * transform.yAxisX + transform.offsetX;
                const transformedY = sourceX * transform.xAxisY + sourceY * transform.yAxisY + transform.offsetY;
                spritePositions.push(transformedX - center.x, center.y - transformedY, sourceZ);
                spriteSizes.push(spriteSize);
                spriteColors.push(hueColor.r, hueColor.g, hueColor.b);
            }
        }
    }
    if (spritePositions.length === 0) {
        if (existingMesh) {
            existingMesh.geometry.instanceCount = 0;
            existingMesh.userData.spriteInstanceCount = 0;
        }
        return null;
    }
    const spriteCount = Math.min(MAX_SPRITE_COUNT, Math.floor(spritePositions.length / 3));
    const mesh = existingMesh ?? createSpriteMesh(spriteTexture, width, height, spriteSoftness);
    ensureCapacity(mesh, spriteCount);
    updateMaterialUniforms(mesh, spriteTexture, width, height, spriteSoftness);
    const offsetArray = mesh.userData.offsetAttr.array;
    const sizeArray = mesh.userData.sizeAttr.array;
    const colorArray = mesh.userData.colorAttr.array;
    for (let i = 0; i < spriteCount; i += 1) {
        const p = i * 3;
        offsetArray[p] = spritePositions[p];
        offsetArray[p + 1] = spritePositions[p + 1];
        offsetArray[p + 2] = spritePositions[p + 2];
        sizeArray[i] = spriteSizes[i];
        colorArray[p] = spriteColors[p];
        colorArray[p + 1] = spriteColors[p + 1];
        colorArray[p + 2] = spriteColors[p + 2];
    }
    mesh.userData.offsetAttr.needsUpdate = true;
    mesh.userData.sizeAttr.needsUpdate = true;
    mesh.userData.colorAttr.needsUpdate = true;
    mesh.geometry.instanceCount = spriteCount;
    mesh.userData.spriteInstanceCount = spriteCount;
    return mesh;
}
