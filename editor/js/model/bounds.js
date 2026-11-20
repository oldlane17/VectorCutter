/**
 * VectorCutter - Bounding Box & Geometry Math
 */

import { transformPoint } from './matrix.js';

export function getElementLocalBounds(el) {
    const g = el.geometry || {};
    switch (el.type) {
        case 'rect':
            return { x: g.x || 0, y: g.y || 0, width: g.width || 0, height: g.height || 0 };
        case 'circle':
            return {
                x: (g.cx || 0) - (g.r || 0),
                y: (g.cy || 0) - (g.r || 0),
                width: (g.r || 0) * 2,
                height: (g.r || 0) * 2
            };
        case 'ellipse':
            return {
                x: (g.cx || 0) - (g.rx || 0),
                y: (g.cy || 0) - (g.ry || 0),
                width: (g.rx || 0) * 2,
                height: (g.ry || 0) * 2
            };
        case 'polygon': {
            const r = g.radius || 25;
            return {
                x: (g.cx || 0) - r,
                y: (g.cy || 0) - r,
                width: r * 2,
                height: r * 2
            };
        }
        case 'star': {
            const r = g.outerRadius || 25;
            return {
                x: (g.cx || 0) - r,
                y: (g.cy || 0) - r,
                width: r * 2,
                height: r * 2
            };
        }
        case 'line':
            const minX = Math.min(g.x1 || 0, g.x2 || 0);
            const minY = Math.min(g.y1 || 0, g.y2 || 0);
            return {
                x: minX,
                y: minY,
                width: Math.abs((g.x2 || 0) - (g.x1 || 0)),
                height: Math.abs((g.y2 || 0) - (g.y1 || 0))
            };
        case 'path':
            // Approximate path bounds from coordinates or fallback
            return parsePathBounds(g.d || 'M 0 0');
        case 'text':
            const len = (g.text || '').length;
            const size = g.fontSize || 14;
            return {
                x: g.x || 0,
                y: (g.y || 0) - size,
                width: Math.max(20, len * size * 0.6),
                height: size * 1.2
            };
        default:
            return { x: 0, y: 0, width: 50, height: 50 };
    }
}

export function parsePathBounds(d) {
    const nums = d.match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g);
    if (!nums || nums.length < 2) return { x: 0, y: 0, width: 20, height: 20 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < nums.length - 1; i += 2) {
        const x = parseFloat(nums[i]);
        const y = parseFloat(nums[i + 1]);
        if (!isNaN(x)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        }
        if (!isNaN(y)) {
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }
    if (minX === Infinity) return { x: 0, y: 0, width: 20, height: 20 };
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

export function getTransformedCorners(localBox, transform) {
    const corners = [
        { x: localBox.x, y: localBox.y },
        { x: localBox.x + localBox.width, y: localBox.y },
        { x: localBox.x + localBox.width, y: localBox.y + localBox.height },
        { x: localBox.x, y: localBox.y + localBox.height }
    ];
    return corners.map(pt => transformPoint(transform, pt));
}
