import type { CustomPreset, CustomPresetStoreV1, LayerConfig, LayerPresetData } from './types'

export function toLayerPresetData(layer: LayerConfig): LayerPresetData {
  return {
    exprX: layer.exprX,
    exprY: layer.exprY,
    exprZ: layer.exprZ,
    R: layer.R,
    r: layer.r,
    d: layer.d,
    zScale: layer.zScale,
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
  }
}

export function normalizeCustomPreset(input: unknown): CustomPreset | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const raw = input as Partial<CustomPreset> & { data?: Partial<LayerPresetData> }
  if (!raw.id || !raw.name || !raw.data) {
    return null
  }
  const data = raw.data
  if (typeof data.exprX !== 'string' || typeof data.exprY !== 'string') {
    return null
  }

  return {
    id: String(raw.id),
    name: String(raw.name),
    data: {
      exprX: data.exprX,
      exprY: data.exprY,
      exprZ: typeof data.exprZ === 'string' ? data.exprZ : '0',
      R: Number.isFinite(data.R) ? Number(data.R) : 8,
      r: Number.isFinite(data.r) ? Number(data.r) : 3,
      d: Number.isFinite(data.d) ? Number(data.d) : 6,
      zScale: Number.isFinite(data.zScale) ? Number(data.zScale) : 0.6,
      speed: Number.isFinite(data.speed) ? Number(data.speed) : 1.8,
      uSpeed: Number.isFinite(data.uSpeed) ? Number(data.uSpeed) : 0.4,
      lineLifetime: Number.isFinite(data.lineLifetime) ? Number(data.lineLifetime) : 8,
      lineForever: Boolean(data.lineForever),
      pointSize: Number.isFinite(data.pointSize) ? Number(data.pointSize) : 2.4,
      multiLineCount: Number.isFinite(data.multiLineCount) ? Math.max(1, Math.min(16, Math.round(Number(data.multiLineCount)))) : 1,
      multiLineMotion: data.multiLineMotion === 'orbit' || data.multiLineMotion === 'random' ? data.multiLineMotion : 'fixed',
      multiLineSpread: Number.isFinite(data.multiLineSpread) ? Math.max(0, Number(data.multiLineSpread)) : 14,
      multiLineMotionSpeed: Number.isFinite(data.multiLineMotionSpeed) ? Number(data.multiLineMotionSpeed) : 1,
      colorMode:
        data.colorMode === 'age' ||
        data.colorMode === 'speed' ||
        data.colorMode === 'curvature' ||
        data.colorMode === 'palette'
          ? data.colorMode
          : 'hue-cycle',
      paletteId:
        data.paletteId === 'sunset' ||
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
  }
}

export function parseCustomPresetPayload(parsed: unknown): CustomPreset[] {
  if (!parsed || typeof parsed !== 'object') {
    return []
  }
  const payload = parsed as Partial<CustomPresetStoreV1> & { presets?: unknown[] }
  if (payload.version === 1 && Array.isArray(payload.presets)) {
    return payload.presets
      .map((preset: unknown) => normalizeCustomPreset(preset))
      .filter((preset): preset is CustomPreset => preset !== null)
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((preset: unknown) => normalizeCustomPreset(preset))
      .filter((preset): preset is CustomPreset => preset !== null)
  }
  return []
}
