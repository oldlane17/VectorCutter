/**
 * VectorCutter - Units & Geometry Conversion
 * World space is always in physical millimetres (mm).
 */

export const MM_PER_INCH = 25.4;
export const SCREEN_DPI = 96;
export const MM_PER_PX = MM_PER_INCH / SCREEN_DPI; // ~0.2645833 mm per screen px
export const PX_PER_MM = SCREEN_DPI / MM_PER_INCH; // ~3.779527559 px per mm

export const UNIT_CONVERSIONS = {
    'mm': 1,
    'cm': 10,
    'm': 1000,
    'in': MM_PER_INCH,
    'pt': MM_PER_INCH / 72,
    'pc': (MM_PER_INCH / 72) * 12,
    'px': MM_PER_PX
};

export function toMm(val, unit = 'mm') {
    const factor = UNIT_CONVERSIONS[unit] || 1;
    return val * factor;
}

export function fromMm(valMm, unit = 'mm') {
    const factor = UNIT_CONVERSIONS[unit] || 1;
    return valMm / factor;
}

export function formatMm(valMm, precision = 2, unit = 'mm') {
    const converted = fromMm(valMm, unit);
    return converted.toFixed(precision);
}
