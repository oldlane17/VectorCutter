/**
 * VectorCutter - Pen / Path Tool
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { requestRender } from '../core/scheduler.js';

export class PenTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
        this.isDrawing = false;
        this.points = [];
        this.previewEl = null;
    }

    onPointerDown(pt) {
        if (!this.isDrawing) {
            this.isDrawing = true;
            this.points = [{ x: 0, y: 0 }];
            this.previewEl = createElement('path', {
                d: 'M 0 0',
                style: { fill: 'none', stroke: '#007acc', strokeWidth: 0.5 },
                transform: translationMatrix(pt.x, pt.y)
            });
            this.origin = { x: pt.x, y: pt.y };
            this.store.doc.elements[this.previewEl.id] = this.previewEl;
            this.store.doc.order.push(this.previewEl.id);
            this.store.setSelection([this.previewEl.id]);
            requestRender();
        } else {
            // Add new vertex point
            const localX = pt.x - this.origin.x;
            const localY = pt.y - this.origin.y;

            // Close path if clicking near start
            if (this.points.length > 2 && Math.hypot(localX, localY) < 5) {
                this.finishPath(true);
                return;
            }

            this.points.push({ x: localX, y: localY });
            this.updatePreview();
            requestRender();
        }
    }

    onPointerMove(pt) {
        if (!this.isDrawing || !this.previewEl) return;
        const localX = pt.x - this.origin.x;
        const localY = pt.y - this.origin.y;

        let d = 'M 0 0';
        for (let i = 1; i < this.points.length; i++) {
            d += ` L ${this.points[i].x.toFixed(2)} ${this.points[i].y.toFixed(2)}`;
        }
        d += ` L ${localX.toFixed(2)} ${localY.toFixed(2)}`;
        this.previewEl.geometry.d = d;
        requestRender();
    }

    onPointerUp() {}

    finishPath(close = false) {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        let d = 'M 0 0';
        for (let i = 1; i < this.points.length; i++) {
            d += ` L ${this.points[i].x.toFixed(2)} ${this.points[i].y.toFixed(2)}`;
        }
        if (close) d += ' Z';

        const finalEl = { ...this.previewEl, geometry: { d } };
        delete this.store.doc.elements[this.previewEl.id];
        const idx = this.store.doc.order.indexOf(this.previewEl.id);
        if (idx !== -1) this.store.doc.order.splice(idx, 1);

        this.store.dispatch(new AddElementCommand(finalEl));
        this.store.setSelection([finalEl.id]);
        this.previewEl = null;
        this.points = [];
        requestRender();
    }

    updatePreview() {
        if (!this.previewEl) return;
        let d = 'M 0 0';
        for (let i = 1; i < this.points.length; i++) {
            d += ` L ${this.points[i].x.toFixed(2)} ${this.points[i].y.toFixed(2)}`;
        }
        this.previewEl.geometry.d = d;
    }
}
