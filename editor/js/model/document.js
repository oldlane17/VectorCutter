/**
 * VectorCutter - Document Model
 * Single source of truth for the active project.
 */

export function createInitialDocument() {
    return {
        version: 1,
        units: 'mm',
        settings: {
            grid: { enabled: true, majorMm: 10, minorMm: 1 },
            snap: { enabled: true, toGrid: true, toGeometry: true, tolerancePx: 8 },
            laserMode: false,
            bed: { width: 600, height: 400, kerfMm: 0.15 }
        },
        components: {},
        elements: {},
        order: [],
        selection: []
    };
}
