/**
 * VectorCutter - Line Drawing Tool
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { requestRender } from '../core/scheduler.js';

export class LineTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
        this.isDrawing = false;
        this.start = { x: 0, y: 0 };
        this.previewEl = null;
    }

    onPointerDown(pt) {
        this.isDrawing = true;
        this.start = { x: pt.x, y: pt.y };
        this.previewEl = createElement('line', {
            x1: 0,
            y1: 0,
            x2: 1,
            y2: 1,
            style: { fill: 'none', stroke: '#007acc', strokeWidth: 0.5 },
            transform: translationMatrix(pt.x, pt.y)
        });
        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);
        requestRender();
    }

    onPointerMove(pt, e) {
        if (!this.isDrawing || !this.previewEl) return;
        let dx = pt.x - this.start.x;
        let dy = pt.y - this.start.y;

        // Shift snaps to 0°, 45°, 90°
        if (e && e.shiftKey) {
            const angle = Math.atan2(dy, dx);
            const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const len = Math.hypot(dx, dy);
            dx = len * Math.cos(snappedAngle);
            dy = len * Math.sin(snappedAngle);
        }

        this.previewEl.geometry.x2 = dx;
        this.previewEl.geometry.y2 = dy;
        requestRender();
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        const len = Math.hypot(this.previewEl.geometry.x2, this.previewEl.geometry.y2);
        if (len < 3) {
            this.previewEl.geometry.x2 = 50;
            this.previewEl.geometry.y2 = 0;
        }

        const finalEl = { ...this.previewEl };
        delete this.store.doc.elements[this.previewEl.id];
        const idx = this.store.doc.order.indexOf(this.previewEl.id);
        if (idx !== -1) this.store.doc.order.splice(idx, 1);

        this.store.dispatch(new AddElementCommand(finalEl));
        this.store.setSelection([finalEl.id]);
        this.previewEl = null;
        requestRender();
    }
}
