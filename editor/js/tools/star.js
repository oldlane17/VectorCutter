/**
 * VectorCutter - Parametric Star Tool (§4.1)
 * Non-destructive parametric star generation with live drag & snap.
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';
import { events } from '../core/events.js';
import { requestRender } from '../core/scheduler.js';
import { generateStarVertices, verticesToFilletPath } from '../model/generators.js';

export class StarTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;
        this.isDrawing = false;
        this.center = { x: 0, y: 0 };
        this.previewEl = null;

        // Persisted parameters for next star
        this.defaults = {
            points: 5,
            innerRatio: 0.382,
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
            <label>Points: <input type="number" id="optStarPoints" value="${this.defaults.points}" min="3" max="64"></label>
            <label>Inner Ratio: <input type="number" id="optStarRatio" value="${this.defaults.innerRatio}" step="0.05" min="0.05" max="0.95"></label>
            <label>Corner: <input type="number" id="optStarCorner" value="${this.defaults.cornerRadius}" step="0.5" min="0"> mm</label>
        `;
        bar.querySelector('#optStarPoints')?.addEventListener('input', (e) => {
            this.defaults.points = parseInt(e.target.value, 10) || 5;
        });
        bar.querySelector('#optStarRatio')?.addEventListener('input', (e) => {
            this.defaults.innerRatio = parseFloat(e.target.value) || 0.382;
        });
        bar.querySelector('#optStarCorner')?.addEventListener('input', (e) => {
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
            points: this.defaults.points,
            outerRadius: 1,
            innerRatio: this.defaults.innerRatio,
            rotation: 0,
            cornerRadius: this.defaults.cornerRadius,
            cx: 0,
            cy: 0
        };

        this.previewEl = createElement('star', {
            cx: 0,
            cy: 0,
            points: params.points,
            outerRadius: params.outerRadius,
            innerRadius: params.outerRadius * params.innerRatio,
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
        p.outerRadius = radius;
        p.rotation = angleDeg;

        this.previewEl.geometry.outerRadius = radius;
        this.previewEl.geometry.innerRadius = radius * p.innerRatio;
        this.previewEl.geometry.rotation = angleDeg;

        requestRender();
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        const p = this.previewEl.params;
        if (p.outerRadius < 3) {
            p.outerRadius = 25;
            this.previewEl.geometry.outerRadius = 25;
            this.previewEl.geometry.innerRadius = 25 * p.innerRatio;
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
