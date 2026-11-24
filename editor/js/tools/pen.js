/**
 * VectorCutter - Freehand Pen / Path Tool (optimisation.md Feature 2)
 * Smooth freehand drawing with live preview, Ramer-Douglas-Peucker simplification,
 * and auto-close when looping back to the origin.
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { requestRender } from '../core/scheduler.js';

const FREEHAND_SIMPLIFY_EPSILON = 0.5; // 0.5 mm tolerance

export class PenTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
        this.isDrawing = false;
        this.rawPoints = [];
        this.origin = null;
        this.previewEl = null;
    }

    onPointerDown(pt, e) {
        this.isDrawing = true;
        this.origin = { x: pt.x, y: pt.y };
        this.rawPoints = [{ x: 0, y: 0 }];

        const strokeColor = window.__vcDefaultStroke || '#007acc';
        const fillColor = window.__vcDefaultFill || 'none';

        this.previewEl = createElement('path', {
            d: 'M 0 0',
            style: { fill: fillColor, stroke: strokeColor, strokeWidth: 0.5 },
            transform: translationMatrix(pt.x, pt.y)
        });

        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);

        if (e && e.target && e.target.setPointerCapture) {
            try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
        }
        requestRender();
    }

    onPointerMove(pt) {
        if (!this.isDrawing || !this.previewEl) return;
        const lx = pt.x - this.origin.x;
        const ly = pt.y - this.origin.y;

        // Prevent identical consecutive points
        const last = this.rawPoints[this.rawPoints.length - 1];
        if (Math.hypot(lx - last.x, ly - last.y) < 0.2) return;

        this.rawPoints.push({ x: lx, y: ly });

        // Fast live preview with raw points
        this.previewEl.geometry.d = this.buildD(this.rawPoints, false);
        requestRender();
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        if (this.rawPoints.length < 2) {
            // Remove degenerate click without motion
            delete this.store.doc.elements[this.previewEl.id];
            const idx = this.store.doc.order.indexOf(this.previewEl.id);
            if (idx !== -1) this.store.doc.order.splice(idx, 1);
            this.previewEl = null;
            this.rawPoints = [];
            requestRender();
            return;
        }

        const simplified = rdp(this.rawPoints, FREEHAND_SIMPLIFY_EPSILON);

        // Auto-close if end is near origin
        const last = simplified[simplified.length - 1];
        const shouldClose = simplified.length > 2 && Math.hypot(last.x, last.y) < 5;

        const finalD = this.buildD(simplified, shouldClose);

        const finalEl = { ...this.previewEl, geometry: { d: finalD } };
        delete this.store.doc.elements[this.previewEl.id];
        const idx = this.store.doc.order.indexOf(this.previewEl.id);
        if (idx !== -1) this.store.doc.order.splice(idx, 1);

        this.store.dispatch(new AddElementCommand(finalEl));
        this.store.setSelection([finalEl.id]);
        this.previewEl = null;
        this.rawPoints = [];
        requestRender();
    }

    buildD(points, close = false) {
        if (!points || points.length === 0) return 'M 0 0';
        let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
        }
        if (close) d += ' Z';
        return d;
    }
}

/**
 * Ramer-Douglas-Peucker path simplification
 */
function rdp(points, epsilon) {
    if (points.length < 3) return points;

    let maxDist = 0;
    let maxIdx = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const d = pointToLineDistance(points[i], start, end);
        if (d > maxDist) {
            maxDist = d;
            maxIdx = i;
        }
    }

    if (maxDist > epsilon) {
        const left = rdp(points.slice(0, maxIdx + 1), epsilon);
        const right = rdp(points.slice(maxIdx), epsilon);
        return [...left.slice(0, -1), ...right];
    }
    return [start, end];
}

function pointToLineDistance(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(p.x - projX, p.y - projY);
}
