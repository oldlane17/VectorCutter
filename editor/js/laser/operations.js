/**
 * VectorCutter - Laser Operations & Semantics
 * Standard definitions and styles for Cut, Score, Engrave, and Guide operations.
 */

export const LASER_OPERATIONS = {
    cut: {
        id: 'cut',
        name: 'Cut (Vector Outline)',
        color: '#ff3b30', // Vibrant Red
        strokeWidth: 0.1, // mm
        hairline: true,
        fill: 'none',
        description: 'Cuts completely through material'
    },
    score: {
        id: 'score',
        name: 'Score (Vector Crease)',
        color: '#007aff', // Vibrant Blue
        strokeWidth: 0.1, // mm
        hairline: true,
        fill: 'none',
        description: 'Marks surface without cutting through'
    },
    engrave: {
        id: 'engrave',
        name: 'Engrave (Raster Pocket)',
        color: '#5856d6', // Violet
        strokeWidth: 0,
        hairline: false,
        fill: 'rgba(128, 128, 128, 0.45)',
        description: 'Etches surface with raster fills'
    },
    guide: {
        id: 'guide',
        name: 'Guide (Alignment)',
        color: '#34c759', // Green
        strokeWidth: 0.1,
        hairline: true,
        fill: 'none',
        dasharray: '2 2',
        description: 'Ignored during laser output; design aid'
    }
};

export const MATERIAL_PRESETS = [
    { name: 'Birch Plywood 3mm', thickness: 3.0, kerf: 0.15 },
    { name: 'Birch Plywood 6mm', thickness: 6.0, kerf: 0.20 },
    { name: 'Cast Acrylic 3mm', thickness: 3.0, kerf: 0.12 },
    { name: 'Cast Acrylic 5mm', thickness: 5.0, kerf: 0.18 },
    { name: 'MDF 3mm', thickness: 3.0, kerf: 0.14 },
    { name: 'Cardboard 2mm', thickness: 2.0, kerf: 0.10 }
];
