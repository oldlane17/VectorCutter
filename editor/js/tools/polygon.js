/**
 * VectorCutter - Parametric Polygon (N-gon) Tool (§4.2)
 * Non-destructive regular polygon generation with live drag & snap.
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { requestRender } from '../core/scheduler.js';

export class PolygonTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
        this.isDrawing = false;
        this.center = { x: 0, y: 0 };
        this.previewEl = null;

        this.defaults = {
            sides: 6,
            sizeMode: 'circumradius',
            rotation: 0,
            cornerRadius: 0
        };
    }

    activate() {
        this.showOptionsBar();
    }

    deactivate() {
        this.hideOptionsBar();
    }

    showOptionsBar() {
        const bar = document.getElementById('toolOptionsBar');
        if (!bar) return;
        bar.style.display = 'flex';
        bar.innerHTML = `
            <label>Sides: <input type="number" id="optPolySides" value="${this.defaults.sides}" min="3" max="128"></label>
            <label>Mode: 
                <select id="optPolyMode">
                    <option value="circumradius" ${this.defaults.sizeMode === 'circumradius' ? 'selected' : ''}>Circumradius</option>
                    <option value="inradius" ${this.defaults.sizeMode === 'inradius' ? 'selected' : ''}>Inradius</option>
                    <option value="sideLength" ${this.defaults.sizeMode === 'sideLength' ? 'selected' : ''}>Side Length</option>
                </select>
            </label>
            <label>Corner: <input type="number" id="optPolyCorner" value="${this.defaults.cornerRadius}" step="0.5" min="0"> mm</label>
        `;
        bar.querySelector('#optPolySides')?.addEventListener('input', (e) => {
            this.defaults.sides = parseInt(e.target.value, 10) || 6;
        });
        bar.querySelector('#optPolyMode')?.addEventListener('change', (e) => {
            this.defaults.sizeMode = e.target.value;
        });
        bar.querySelector('#optPolyCorner')?.addEventListener('input', (e) => {
            this.defaults.cornerRadius = parseFloat(e.target.value) || 0;
        });
    }

    hideOptionsBar() {
        const bar = document.getElementById('toolOptionsBar');
        if (bar) bar.style.display = 'none';
    }

    onPointerDown(pt) {
        this.isDrawing = true;
        this.center = { x: pt.x, y: pt.y };

        const params = {
            sides: this.defaults.sides,
            radius: 1,
            sizeMode: this.defaults.sizeMode,
            rotation: 0,
            cornerRadius: this.defaults.cornerRadius,
            cx: 0,
            cy: 0
        };

        this.previewEl = createElement('polygon', {
            cx: 0,
            cy: 0,
            sides: params.sides,
            radius: params.radius,
            params: { ...params },
            transform: translationMatrix(pt.x, pt.y)
        });

        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);
        requestRender();
    }

    onPointerMove(pt, e) {
        if (!this.isDrawing || !this.previewEl) return;
        const dx = pt.x - this.center.x;
        const dy = pt.y - this.center.y;
        let radius = Math.hypot(dx, dy);
        let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

        if (e && e.shiftKey) {
            angleDeg = Math.round(angleDeg / 15) * 15;
        }

        radius = Math.max(1, radius);
        const p = this.previewEl.params;
        p.radius = radius;
        p.rotation = angleDeg;

        this.previewEl.geometry.radius = radius;
        this.previewEl.geometry.sides = p.sides;
        this.previewEl.geometry.rotation = angleDeg;

        requestRender();
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        const p = this.previewEl.params;
        if (p.radius < 3) {
            p.radius = 25;
            this.previewEl.geometry.radius = 25;
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
