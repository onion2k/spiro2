import { AdditiveBlending, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3, } from 'three';
import { buildLineOffsets, buildSymmetryVariants, colorForPoint, lineWidthForPoint } from '../runtime';
export function renderInstancedSprites(options) {
    const { runtimeLayer, center, nowSec, step, camera, spriteGeometry, spriteTexture, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg, strokeWidthMode, baseLineWidth, lineWidthBoost, dashedLines, dashLength, dashGap, } = options;
    const layer = runtimeLayer.layer;
    const spritePositions = [];
    const spriteSizes = [];
    const spriteColors = [];
    const dashCycle = Math.max(1, dashLength + dashGap);
    const cameraRotation = new Quaternion().copy(camera.quaternion);
    const spriteMatrix = new Matrix4();
    const spritePosition = new Vector3();
    const spriteScale = new Vector3();
    for (let i = Math.max(step, 1); i < runtimeLayer.trail.length; i += step) {
        const current = runtimeLayer.trail[i];
        if (!current.connected) {
            continue;
        }
        if (dashedLines) {
            const phase = ((current.index % dashCycle) + dashCycle) % dashCycle;
            if (phase > dashLength) {
                continue;
            }
        }
        const pointOffsets = buildLineOffsets(layer, current.index, runtimeLayer.paramU);
        const style = colorForPoint(current, layer, nowSec);
        const rgb = new Color(`hsl(${style.hue}, 90%, 70%)`);
        const spriteSize = Math.max(0.6, lineWidthForPoint(current, strokeWidthMode, baseLineWidth, lineWidthBoost) * 1.35);
        for (const offset of pointOffsets) {
            const copies = buildSymmetryVariants({ x: current.x + offset.x, y: current.y + offset.y }, center, mirrorX, mirrorY, rotationalRepeats, rotationOffsetDeg);
            for (const copy of copies) {
                spritePositions.push(copy.x - center.x, center.y - copy.y, current.z);
                spriteSizes.push(spriteSize);
                spriteColors.push(rgb.clone());
            }
        }
    }
    if (spritePositions.length === 0) {
        return null;
    }
    const spriteCount = Math.min(20000, Math.floor(spritePositions.length / 3));
    const spriteMaterial = new MeshBasicMaterial({
        color: 0xffffff,
        map: spriteTexture,
        transparent: true,
        opacity: 0.78,
        blending: AdditiveBlending,
        toneMapped: false,
        depthWrite: false,
        vertexColors: true,
    });
    const spriteMesh = new InstancedMesh(spriteGeometry, spriteMaterial, spriteCount);
    for (let i = 0; i < spriteCount; i += 1) {
        const p = i * 3;
        spritePosition.set(spritePositions[p], spritePositions[p + 1], spritePositions[p + 2]);
        const size = spriteSizes[i];
        spriteScale.set(size, size, 1);
        spriteMatrix.compose(spritePosition, cameraRotation, spriteScale);
        spriteMesh.setMatrixAt(i, spriteMatrix);
        spriteMesh.setColorAt(i, spriteColors[i]);
    }
    spriteMesh.instanceMatrix.needsUpdate = true;
    if (spriteMesh.instanceColor) {
        spriteMesh.instanceColor.needsUpdate = true;
    }
    return spriteMesh;
}
