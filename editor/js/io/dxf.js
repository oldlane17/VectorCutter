/**
 * VectorCutter - DXF R12 Exporter for Laser & CNC
 * Generates clean ASCII DXF with separate layers for CUT, SCORE, ENGRAVE, and GUIDE.
 */

import { elementToPathD } from '../ops/boolean.js';

export function generateDXF(store) {
    const doc = store.doc;
    const lines = [
        '0', 'SECTION',
        '2', 'HEADER',
        '9', '$ACADVER',
        '1', 'AC1009', // DXF R12
        '9', '$INSUNITS',
        '70', '4', // Millimeters
        '0', 'ENDSEC',
        '0', 'SECTION',
        '2', 'TABLES',
        '0', 'TABLE',
        '2', 'LAYER',
        '70', '4',
        // Layer CUT (Color 1 = Red)
        '0', 'LAYER', '2', 'CUT', '70', '0', '62', '1', '6', 'CONTINUOUS',
        // Layer SCORE (Color 5 = Blue)
        '0', 'LAYER', '2', 'SCORE', '70', '0', '62', '5', '6', 'CONTINUOUS',
        // Layer ENGRAVE (Color 7 = White)
        '0', 'LAYER', '2', 'ENGRAVE', '70', '0', '62', '7', '6', 'CONTINUOUS',
        // Layer GUIDE (Color 3 = Green)
        '0', 'LAYER', '2', 'GUIDE', '70', '0', '62', '3', '6', 'CONTINUOUS',
        '0', 'ENDTAB',
        '0', 'ENDSEC',
        '0', 'SECTION',
        '2', 'ENTITIES'
    ];

    for (const id of doc.order) {
        const el = doc.elements[id];
        if (!el || el.visible === false) continue;

        const op = (el.laser?.op || 'cut').toUpperCase();
        const layer = ['CUT', 'SCORE', 'ENGRAVE', 'GUIDE'].includes(op) ? op : 'CUT';
        const tx = el.transform[4] || 0;
        const ty = el.transform[5] || 0;

        if (el.type === 'line') {
            const g = el.geometry || {};
            lines.push(
                '0', 'LINE',
                '8', layer,
                '10', (tx + (g.x1 || 0)).toFixed(3),
                '20', (-(ty + (g.y1 || 0))).toFixed(3),
                '30', '0.0',
                '11', (tx + (g.x2 || 0)).toFixed(3),
                '20', (-(ty + (g.y2 || 0))).toFixed(3),
                '30', '0.0'
            );
        } else if (el.type === 'circle') {
            const g = el.geometry || {};
            lines.push(
                '0', 'CIRCLE',
                '8', layer,
                '10', (tx + (g.cx || 0)).toFixed(3),
                '20', (-(ty + (g.cy || 0))).toFixed(3),
                '30', '0.0',
                '40', (g.r || 10).toFixed(3)
            );
        } else {
            // General polyline path
            const d = elementToPathD(el);
            const pts = parsePathPoints(d, tx, ty);
            if (pts.length > 1) {
                lines.push(
                    '0', 'POLYLINE',
                    '8', layer,
                    '66', '1',
                    '70', pts.closed ? '1' : '0'
                );
                for (const pt of pts) {
                    lines.push(
                        '0', 'VERTEX',
                        '8', layer,
                        '10', pt.x.toFixed(3),
                        '20', (-pt.y).toFixed(3),
                        '30', '0.0'
                    );
                }
                lines.push('0', 'SEQEND');
            }
        }
    }

    lines.push('0', 'ENDSEC', '0', 'EOF');
    return lines.join('\r\n');
}

function parsePathPoints(d, tx, ty) {
    const nums = d.match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g);
    const pts = [];
    if (!nums) return pts;
    for (let i = 0; i < nums.length - 1; i += 2) {
        pts.push({
            x: tx + parseFloat(nums[i]),
            y: ty + parseFloat(nums[i + 1])
        });
    }
    pts.closed = d.toUpperCase().includes('Z');
    return pts;
}

export function downloadDXF(store, filename = 'vectorcutter.dxf') {
    const content = generateDXF(store);
    const blob = new Blob([content], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
