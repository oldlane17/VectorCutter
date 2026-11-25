/**
 * VectorCutter - Bounding Box & Geometry Math
 */

import { transformPoint } from './matrix.js';
import { generateStarVertices, generatePolygonVertices } from './generators.js';

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
        case 'text': {
            if (el._latexBounds) {
                return {
                    x: el._latexBounds.x !== undefined ? el._latexBounds.x : (g.x || 0),
                    y: el._latexBounds.y !== undefined ? el._latexBounds.y : ((g.y || 0) - el._latexBounds.height),
                    width: el._latexBounds.width,
                    height: el._latexBounds.height
                };
            }
            const len = (g.text || '').length;
            const size = g.fontSize || 14;
            return {
                x: g.x || 0,
                y: (g.y || 0) - size,
                width: Math.max(20, len * size * 0.6),
                height: size * 1.2
            };
        }
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

/**
 * Point in polygon test for convex or non-convex polygons
 */
export function pointInPolygon(px, py, corners) {
    let inside = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const xi = corners[i].x, yi = corners[i].y;
        const xj = corners[j].x, yj = corners[j].y;
        if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Returns world coordinates of the rotation centre for an element
 */
export function getRotationCentre(el) {
    if (!el) return { x: 0, y: 0 };
    const m = el.transform || [1, 0, 0, 1, 0, 0];
    if (el.rotationCenter) {
        if (el.rotationCenter.mode === 'absolute') {
            return { x: el.rotationCenter.x, y: el.rotationCenter.y };
        }
        // 'object' mode: relative to local element coordinates
        return transformPoint(m, { x: el.rotationCenter.x, y: el.rotationCenter.y });
    }
    // Default: visual mass centre
    const box = getElementLocalBounds(el);
    const localCx = box.x + box.width / 2;
    const localCy = box.y + box.height / 2;
    return transformPoint(m, { x: localCx, y: localCy });
}

/**
 * Computes the adaptive minor grid step in mm matching GridRenderer.
 */
export function getAdaptiveGridStep(scale) {
    const targetMinorPx = 14;
    const rawWorldStep = targetMinorPx / Math.max(0.01, scale);
    const power = Math.floor(Math.log10(rawWorldStep));
    const base = Math.pow(10, power);
    const fraction = rawWorldStep / base;
    if (fraction < 1.5) return base * 1;
    if (fraction < 3.5) return base * 2;
    if (fraction < 7.5) return base * 5;
    return base * 10;
}

/**
 * Extracts all significant geometry snap points (corners, vertices, midpoints, centers)
 * for an element in world coordinates.
 */
export function getElementSnapPoints(el) {
    if (!el || el.visible === false) return [];
    const m = el.transform || [1, 0, 0, 1, 0, 0];
    const g = el.geometry || {};
    const localPts = [];

    const box = getElementLocalBounds(el);
    // Bounding box corners & center
    localPts.push(
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height },
        { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    );

    switch (el.type) {
        case 'rect':
            localPts.push(
                { x: box.x + box.width / 2, y: box.y },
                { x: box.x + box.width, y: box.y + box.height / 2 },
                { x: box.x + box.width / 2, y: box.y + box.height },
                { x: box.x, y: box.y + box.height / 2 }
            );
            break;
        case 'circle': {
            const cx = g.cx || 0, cy = g.cy || 0, r = g.r || 0;
            localPts.push(
                { x: cx, y: cy },
                { x: cx + r, y: cy }, { x: cx - r, y: cy },
                { x: cx, y: cy + r }, { x: cx, y: cy - r }
            );
            break;
        }
        case 'ellipse': {
            const cx = g.cx || 0, cy = g.cy || 0, rx = g.rx || 0, ry = g.ry || 0;
            localPts.push(
                { x: cx, y: cy },
                { x: cx + rx, y: cy }, { x: cx - rx, y: cy },
                { x: cx, y: cy + ry }, { x: cx, y: cy - ry }
            );
            break;
        }
        case 'line': {
            const x1 = g.x1 || 0, y1 = g.y1 || 0, x2 = g.x2 || 0, y2 = g.y2 || 0;
            localPts.push(
                { x: x1, y: y1 },
                { x: x2, y: y2 },
                { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
            );
            break;
        }
        case 'polygon': {
            const verts = generatePolygonVertices(el.params && el.params.sides ? el.params : g);
            verts.forEach(v => localPts.push(v));
            break;
        }
        case 'star': {
            const verts = generateStarVertices(el.params && el.params.points ? el.params : g);
            verts.forEach(v => localPts.push(v));
            break;
        }
        case 'path': {
            const nums = (g.d || '').match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g);
            if (nums && nums.length >= 2) {
                const step = nums.length > 160 ? Math.floor(nums.length / 80) * 2 : 2;
                for (let i = 0; i < nums.length - 1; i += step) {
                    const px = parseFloat(nums[i]);
                    const py = parseFloat(nums[i + 1]);
                    if (!isNaN(px) && !isNaN(py)) localPts.push({ x: px, y: py });
                }
            }
            break;
        }
    }

    return localPts.map(pt => transformPoint(m, pt));
}
