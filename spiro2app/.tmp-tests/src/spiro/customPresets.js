export function toLayerPresetData(layer) {
    return {
        exprX: layer.exprX,
        exprY: layer.exprY,
        exprZ: layer.exprZ,
        generatorKind: layer.generatorKind,
        lissajousAx: layer.lissajousAx,
        lissajousAy: layer.lissajousAy,
        lissajousAz: layer.lissajousAz,
        lissajousFx: layer.lissajousFx,
        lissajousFy: layer.lissajousFy,
        lissajousFz: layer.lissajousFz,
        lissajousPhaseX: layer.lissajousPhaseX,
        lissajousPhaseY: layer.lissajousPhaseY,
        lissajousPhaseZ: layer.lissajousPhaseZ,
        lissajousUMixX: layer.lissajousUMixX,
        lissajousUMixY: layer.lissajousUMixY,
        lissajousUMixZ: layer.lissajousUMixZ,
        attractorSigma: layer.attractorSigma,
        attractorRho: layer.attractorRho,
        attractorBeta: layer.attractorBeta,
        attractorStepScale: layer.attractorStepScale,
        attractorInitialX: layer.attractorInitialX,
        attractorInitialY: layer.attractorInitialY,
        attractorInitialZ: layer.attractorInitialZ,
        attractorScale: layer.attractorScale,
        attractorWarmupSteps: layer.attractorWarmupSteps,
        attractorEquation: layer.attractorEquation,
        R: layer.R,
        r: layer.r,
        d: layer.d,
        speed: layer.speed,
        uSpeed: layer.uSpeed,
        lineLifetime: layer.lineLifetime,
        lineForever: layer.lineForever,
        pointSize: layer.pointSize,
        multiLineCount: layer.multiLineCount,
        multiLineMotion: layer.multiLineMotion,
        multiLineSpread: layer.multiLineSpread,
        multiLineMotionSpeed: layer.multiLineMotionSpeed,
        colorMode: layer.colorMode,
        paletteId: layer.paletteId,
        hueLock: layer.hueLock,
        baseHue: layer.baseHue,
    };
}
export function normalizeCustomPreset(input) {
    if (!input || typeof input !== 'object') {
        return null;
    }
    const raw = input;
    if (!raw.id || !raw.name || !raw.data) {
        return null;
    }
    const data = raw.data;
    if (typeof data.exprX !== 'string' || typeof data.exprY !== 'string') {
        return null;
    }
    return {
        id: String(raw.id),
        name: String(raw.name),
        data: {
            exprX: data.exprX,
            exprY: data.exprY,
            exprZ: typeof data.exprZ === 'string' ? data.exprZ : '0',
            generatorKind: data.generatorKind === 'lissajous' || data.generatorKind === 'strange-attractor'
                ? data.generatorKind
                : 'parametric',
            lissajousAx: Number.isFinite(data.lissajousAx) ? Number(data.lissajousAx) : (Number.isFinite(data.R) ? Number(data.R) : 8),
            lissajousAy: Number.isFinite(data.lissajousAy) ? Number(data.lissajousAy) : (Number.isFinite(data.r) ? Number(data.r) : 3),
            lissajousAz: Number.isFinite(data.lissajousAz) ? Number(data.lissajousAz) : (Number.isFinite(data.d) ? Number(data.d) : 6),
            lissajousFx: Number.isFinite(data.lissajousFx) ? Number(data.lissajousFx) : 3,
            lissajousFy: Number.isFinite(data.lissajousFy) ? Number(data.lissajousFy) : 2,
            lissajousFz: Number.isFinite(data.lissajousFz) ? Number(data.lissajousFz) : 5,
            lissajousPhaseX: Number.isFinite(data.lissajousPhaseX) ? Number(data.lissajousPhaseX) : Math.PI / 2,
            lissajousPhaseY: Number.isFinite(data.lissajousPhaseY) ? Number(data.lissajousPhaseY) : 0,
            lissajousPhaseZ: Number.isFinite(data.lissajousPhaseZ) ? Number(data.lissajousPhaseZ) : Math.PI / 4,
            lissajousUMixX: Number.isFinite(data.lissajousUMixX) ? Number(data.lissajousUMixX) : 0.25,
            lissajousUMixY: Number.isFinite(data.lissajousUMixY) ? Number(data.lissajousUMixY) : 0.2,
            lissajousUMixZ: Number.isFinite(data.lissajousUMixZ) ? Number(data.lissajousUMixZ) : 0.3,
            attractorSigma: Number.isFinite(data.attractorSigma) ? Number(data.attractorSigma) : 10,
            attractorRho: Number.isFinite(data.attractorRho) ? Number(data.attractorRho) : 28,
            attractorBeta: Number.isFinite(data.attractorBeta) ? Number(data.attractorBeta) : 8 / 3,
            attractorStepScale: Number.isFinite(data.attractorStepScale) ? Number(data.attractorStepScale) : 1,
            attractorInitialX: Number.isFinite(data.attractorInitialX) ? Number(data.attractorInitialX) : 0.1,
            attractorInitialY: Number.isFinite(data.attractorInitialY) ? Number(data.attractorInitialY) : 0,
            attractorInitialZ: Number.isFinite(data.attractorInitialZ) ? Number(data.attractorInitialZ) : 0,
            attractorScale: Number.isFinite(data.attractorScale) ? Number(data.attractorScale) : 0.35,
            attractorWarmupSteps: Number.isFinite(data.attractorWarmupSteps)
                ? Math.max(0, Math.min(2000, Math.round(Number(data.attractorWarmupSteps))))
                : 120,
            attractorEquation: data.attractorEquation === 'rossler' ||
                data.attractorEquation === 'chen' ||
                data.attractorEquation === 'thomas' ||
                data.attractorEquation === 'halvorsen' ||
                data.attractorEquation === 'aizawa' ||
                data.attractorEquation === 'lu-chen' ||
                data.attractorEquation === 'rabinovich-fabrikant'
                ? data.attractorEquation
                : 'lorenz',
            R: Number.isFinite(data.R) ? Number(data.R) : 8,
            r: Number.isFinite(data.r) ? Number(data.r) : 3,
            d: Number.isFinite(data.d) ? Number(data.d) : 6,
            speed: Number.isFinite(data.speed) ? Number(data.speed) : 1.8,
            uSpeed: Number.isFinite(data.uSpeed) ? Number(data.uSpeed) : 0.4,
            lineLifetime: Number.isFinite(data.lineLifetime) ? Number(data.lineLifetime) : 8,
            lineForever: Boolean(data.lineForever),
            pointSize: Number.isFinite(data.pointSize) ? Number(data.pointSize) : 2.4,
            multiLineCount: Number.isFinite(data.multiLineCount) ? Math.max(1, Math.min(16, Math.round(Number(data.multiLineCount)))) : 1,
            multiLineMotion: data.multiLineMotion === 'orbit' || data.multiLineMotion === 'random' ? data.multiLineMotion : 'fixed',
            multiLineSpread: Number.isFinite(data.multiLineSpread) ? Math.max(0, Number(data.multiLineSpread)) : 14,
            multiLineMotionSpeed: Number.isFinite(data.multiLineMotionSpeed) ? Number(data.multiLineMotionSpeed) : 1,
            colorMode: data.colorMode === 'age' ||
                data.colorMode === 'speed' ||
                data.colorMode === 'curvature' ||
                data.colorMode === 'palette'
                ? data.colorMode
                : 'hue-cycle',
            paletteId: data.paletteId === 'sunset' ||
                data.paletteId === 'ocean' ||
                data.paletteId === 'forest' ||
                data.paletteId === 'candy'
                ? data.paletteId
                : 'neon',
            hueLock: Boolean(data.hueLock),
            baseHue: Number.isFinite(data.baseHue) ? Number(data.baseHue) : 210,
        },
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    };
}
export function parseCustomPresetPayload(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        return [];
    }
    const payload = parsed;
    if (payload.version === 1 && Array.isArray(payload.presets)) {
        return payload.presets
            .map((preset) => normalizeCustomPreset(preset))
            .filter((preset) => preset !== null);
    }
    if (Array.isArray(parsed)) {
        return parsed
            .map((preset) => normalizeCustomPreset(preset))
            .filter((preset) => preset !== null);
    }
    return [];
}
