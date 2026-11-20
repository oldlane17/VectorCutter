/**
 * VectorCutter - 3D Geometry Processing Pipeline (§7.3)
 * Converts 2D SVG elements into watertight 3D meshes using ClipperLib and Earcut.
 */

import { generateStarVertices, generatePolygonVertices } from '../model/generators.js';
import { transformPoint } from '../model/matrix.js';

const CLIPPER_SCALE = 1000; // 1000 units = 1 mm (1 µm precision)

// Font cache for opentype.js
const fontCache = new Map();
const ROBOTO_FONT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf';

export async function loadFont(family = 'Roboto') {
    if (fontCache.has(family)) return fontCache.get(family);
    try {
        if (typeof window === 'undefined' || !window.opentype) return null;
        const font = await new Promise((resolve, reject) => {
            window.opentype.load(ROBOTO_FONT_URL, (err, f) => {
                if (err) reject(err);
                else resolve(f);
            });
        });
        fontCache.set(family, font);
        return font;
    } catch (err) {
        console.warn(`[3D Geometry] Failed to load font "${family}":`, err);
        return null;
    }
}

/**
 * Extracts clean, closed 2D world-space polygon rings from a document element.
 */
export async function extractElementRings(el) {
    const rawRings = [];

    switch (el.type) {
        case 'rect': {
            const g = el.geometry || {};
            const x = g.x || 0;
            const y = g.y || 0;
            const w = Math.max(0.1, g.width || 10);
            const h = Math.max(0.1, g.height || 10);
            rawRings.push([
                { x, y },
                { x: x + w, y },
                { x: x + w, y: y + h },
                { x, y: y + h }
            ]);
            break;
        }

        case 'circle': {
            const g = el.geometry || {};
            const cx = g.cx || 0;
            const cy = g.cy || 0;
            const r = Math.max(0.1, g.r || 10);
            const pts = [];
            const segments = 96;
            for (let i = 0; i < segments; i++) {
                const a = (i * 2 * Math.PI) / segments;
                pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
            }
            rawRings.push(pts);
            break;
        }

        case 'ellipse': {
            const g = el.geometry || {};
            const cx = g.cx || 0;
            const cy = g.cy || 0;
            const rx = Math.max(0.1, g.rx || 15);
            const ry = Math.max(0.1, g.ry || 10);
            const pts = [];
            const segments = 96;
            for (let i = 0; i < segments; i++) {
                const a = (i * 2 * Math.PI) / segments;
                pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
            }
            rawRings.push(pts);
            break;
        }

        case 'polygon': {
            let pts = [];
            if (el.params) {
                pts = generatePolygonVertices(el.params);
            } else if (el.geometry?.points) {
                pts = parsePointsString(el.geometry.points);
            } else {
                const sides = el.geometry?.sides || 6;
                const r = el.geometry?.radius || 20;
                for (let i = 0; i < sides; i++) {
                    const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
                    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
                }
            }
            if (pts.length >= 3) rawRings.push(pts);
            break;
        }

        case 'star': {
            let pts = [];
            if (el.params) {
                pts = generateStarVertices(el.params);
            } else {
                const points = el.geometry?.points || 5;
                const outerR = el.geometry?.outerRadius || 25;
                const innerR = el.geometry?.innerRadius || 12.5;
                const total = points * 2;
                for (let i = 0; i < total; i++) {
                    const r = (i % 2 === 0) ? outerR : innerR;
                    const a = (i * Math.PI) / points - Math.PI / 2;
                    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
                }
            }
            if (pts.length >= 3) rawRings.push(pts);
            break;
        }

        case 'path': {
            const d = el.geometry?.d || '';
            const rings = parseSVGPathToRings(d);
            rawRings.push(...rings);
            break;
        }

        case 'text': {
            const g = el.geometry || {};
            const text = g.text || 'Text';
            const fontSize = g.fontSize || 16;
            const font = await loadFont(g.fontFamily);
            if (font) {
                const path = font.getPath(text, 0, 0, fontSize);
                const rings = parseOpenTypePath(path);
                rawRings.push(...rings);
            } else {
                // Fallback bounding box ring if font fails
                const w = text.length * fontSize * 0.6;
                const h = fontSize;
                rawRings.push([
                    { x: 0, y: -h },
                    { x: w, y: -h },
                    { x: w, y: 0 },
                    { x: 0, y: 0 }
                ]);
            }
            break;
        }

        default:
            break;
    }

    // Apply object transform to world coordinates
    const worldRings = rawRings.map(ring => {
        return ring.map(pt => transformPoint(pt.x, pt.y, el.transform));
    });

    return cleanAndClassifyRings(worldRings);
}

/**
 * Classifies rings into polygons with outer boundaries and inner holes.
 */
export function cleanAndClassifyRings(rawRings) {
    const cleaned = [];

    for (const ring of rawRings) {
        if (ring.length < 3) continue;
        const pts = [];
        for (let i = 0; i < ring.length; i++) {
            const curr = ring[i];
            const next = ring[(i + 1) % ring.length];
            if (Math.hypot(next.x - curr.x, next.y - curr.y) > 1e-4) {
                pts.push(curr);
            }
        }
        if (pts.length >= 3) {
            const area = computeSignedArea(pts);
            if (Math.abs(area) > 1e-3) {
                cleaned.push({ points: pts, area });
            }
        }
    }

    if (cleaned.length === 0) return [];

    // Outer rings: Counter-Clockwise (area > 0)
    // Hole rings: Clockwise (area < 0)
    const classified = cleaned.map(r => {
        let pts = [...r.points];
        if (r.area < 0) {
            // Clockwise -> Flip to CCW if it's considered outer
        }
        return {
            points: pts,
            area: r.area,
            isCCW: r.area > 0
        };
    });

    return classified;
}

export function computeSignedArea(points) {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return area / 2;
}

/**
 * Resamples a polygon ring by arc length to contain exactly targetCount points.
 */
export function resampleRing(ring, targetCount) {
    if (ring.length === targetCount) return ring;
    const n = ring.length;
    const lengths = [0];
    let totalLen = 0;

    for (let i = 0; i < n; i++) {
        const next = ring[(i + 1) % n];
        totalLen += Math.hypot(next.x - ring[i].x, next.y - ring[i].y);
        lengths.push(totalLen);
    }

    if (totalLen <= 1e-6) return ring;

    const resampled = [];
    const step = totalLen / targetCount;

    for (let k = 0; k < targetCount; k++) {
        const targetDist = k * step;
        let idx = 0;
        while (idx < n && lengths[idx + 1] < targetDist) {
            idx++;
        }
        const segStart = lengths[idx];
        const segEnd = lengths[idx + 1] || totalLen;
        const segLen = segEnd - segStart;
        const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;

        const p1 = ring[idx % n];
        const p2 = ring[(idx + 1) % n];
        resampled.push({
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        });
    }

    return resampled;
}

/**
 * Offsets a closed 2D polygon ring by distance in mm using ClipperLib.
 */
export function offsetRing(ring, deltaMm, joinType = 'miter') {
    if (Math.abs(deltaMm) < 1e-4) return [[...ring]];
    if (typeof window === 'undefined' || !window.ClipperLib) return [[...ring]];

    const path = ring.map(pt => ({
        X: Math.round(pt.x * CLIPPER_SCALE),
        Y: Math.round(pt.y * CLIPPER_SCALE)
    }));

    const co = new window.ClipperLib.ClipperOffset();
    const jt = joinType === 'round' ? window.ClipperLib.JoinType.jtRound : window.ClipperLib.JoinType.jtMiter;
    const et = window.ClipperLib.EndType.etClosedPolygon;

    co.AddPath(path, jt, et);
    co.MiterLimit = 2.0;

    const solution = new window.ClipperLib.Paths();
    co.Execute(solution, deltaMm * CLIPPER_SCALE);

    const resultRings = [];
    for (let i = 0; i < solution.length; i++) {
        const poly = solution[i];
        if (poly.length >= 3) {
            resultRings.push(poly.map(pt => ({
                x: pt.X / CLIPPER_SCALE,
                y: pt.Y / CLIPPER_SCALE
            })));
        }
    }

    return resultRings;
}

/**
 * Triangulates top/bottom caps using Earcut.
 */
export function triangulateCap(outerRing, holeRings = [], z = 0, normalUp = true) {
    const flatCoords = [];
    const holeIndices = [];

    // Outer ring
    outerRing.forEach(p => flatCoords.push(p.x, p.y));

    // Holes
    holeRings.forEach(hole => {
        holeIndices.push(flatCoords.length / 2);
        hole.forEach(p => flatCoords.push(p.x, p.y));
    });

    let triIndices = [];
    if (typeof window !== 'undefined' && window.earcut) {
        triIndices = window.earcut(flatCoords, holeIndices);
    } else {
        // Fallback fan triangulation for convex / simple polygons
        for (let i = 1; i < outerRing.length - 1; i++) {
            triIndices.push(0, i, i + 1);
        }
    }

    const vertices = [];
    const totalPts = flatCoords.length / 2;

    for (let i = 0; i < totalPts; i++) {
        vertices.push(flatCoords[i * 2], flatCoords[i * 2 + 1], z);
    }

    const indices = [];
    for (let i = 0; i < triIndices.length; i += 3) {
        if (normalUp) {
            indices.push(triIndices[i], triIndices[i + 1], triIndices[i + 2]);
        } else {
            // Flip for downward normal
            indices.push(triIndices[i], triIndices[i + 2], triIndices[i + 1]);
        }
    }

    return { vertices, indices };
}

/**
 * OpenType path command parser into closed polyline rings.
 */
function parseOpenTypePath(path) {
    const rings = [];
    let curr = [];

    for (const cmd of path.commands) {
        if (cmd.type === 'M') {
            if (curr.length >= 3) rings.push(curr);
            curr = [{ x: cmd.x, y: cmd.y }];
        } else if (cmd.type === 'L') {
            curr.push({ x: cmd.x, y: cmd.y });
        } else if (cmd.type === 'Q') {
            // Quadratic Bézier flattening
            const p0 = curr[curr.length - 1] || { x: 0, y: 0 };
            const p1 = { x: cmd.x1, y: cmd.y1 };
            const p2 = { x: cmd.x, y: cmd.y };
            const steps = 8;
            for (let t = 1; t <= steps; t++) {
                const s = t / steps;
                const inv = 1 - s;
                curr.push({
                    x: inv * inv * p0.x + 2 * inv * s * p1.x + s * s * p2.x,
                    y: inv * inv * p0.y + 2 * inv * s * p1.y + s * s * p2.y
                });
            }
        } else if (cmd.type === 'C') {
            // Cubic Bézier flattening
            const p0 = curr[curr.length - 1] || { x: 0, y: 0 };
            const p1 = { x: cmd.x1, y: cmd.y1 };
            const p2 = { x: cmd.x2, y: cmd.y2 };
            const p3 = { x: cmd.x, y: cmd.y };
            const steps = 12;
            for (let t = 1; t <= steps; t++) {
                const s = t / steps;
                const inv = 1 - s;
                curr.push({
                    x: inv * inv * inv * p0.x + 3 * inv * inv * s * p1.x + 3 * inv * s * s * p2.x + s * s * s * p3.x,
                    y: inv * inv * inv * p0.y + 3 * inv * inv * s * p1.y + 3 * inv * s * s * p2.y + s * s * s * p3.y
                });
            }
        } else if (cmd.type === 'Z') {
            if (curr.length >= 3) rings.push(curr);
            curr = [];
        }
    }

    if (curr.length >= 3) rings.push(curr);
    return rings;
}

function parsePointsString(str) {
    if (!str) return [];
    return str.trim().split(/[\s,]+/).reduce((acc, val, i, arr) => {
        if (i % 2 === 0 && arr[i + 1] !== undefined) {
            acc.push({ x: parseFloat(val) || 0, y: parseFloat(arr[i + 1]) || 0 });
        }
        return acc;
    }, []);
}

function parseSVGPathToRings(d) {
    if (!d) return [];
    const rings = [];
    const matches = d.match(/[a-df-z][^a-df-z]*/gi) || [];
    let curr = [];
    let curX = 0, curY = 0;

    for (const match of matches) {
        const type = match[0];
        const nums = match.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

        if (type === 'M' || type === 'm') {
            if (curr.length >= 3) rings.push(curr);
            curX = type === 'M' ? nums[0] : curX + nums[0];
            curY = type === 'M' ? nums[1] : curY + nums[1];
            curr = [{ x: curX, y: curY }];
        } else if (type === 'L' || type === 'l') {
            for (let i = 0; i < nums.length; i += 2) {
                curX = type === 'L' ? nums[i] : curX + nums[i];
                curY = type === 'L' ? nums[i + 1] : curY + nums[i + 1];
                curr.push({ x: curX, y: curY });
            }
        } else if (type === 'Z' || type === 'z') {
            if (curr.length >= 3) rings.push(curr);
            curr = [];
        }
    }

    if (curr.length >= 3) rings.push(curr);
    return rings;
}
