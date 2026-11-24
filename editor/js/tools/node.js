/**
 * VectorCutter - Curve / Node Edit Tool (optimisation.md Feature 3)
 * Mode A: Draw smooth Bézier curves with interactive control-handle dragging.
 * Mode B: Edit nodes and control handles of selected path elements.
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand, TransformElementsCommand } from '../core/commands.js';
import { translationMatrix, transformPoint } from '../model/matrix.js';
import { elementToPathD } from '../ops/boolean.js';
import { requestRender } from '../core/scheduler.js';

export class NodeTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store = store;

        this.mode = 'draw'; // 'draw' | 'edit'
        this.isDrawing = false;
        this.isEditingNode = false;

        this.start = { x: 0, y: 0 };
        this.controlPoint = { x: 0, y: 0 };
        this.endPoint = { x: 0, y: 0 };
        this.previewEl = null;

        // Edit state
        this.activePathEl = null;
        this.parsedNodes = [];
        this.activeNodeIndex = -1;
        this.activeHandleType = null; // 'anchor' | 'cp1' | 'cp2'
    }

    activate() {
        const selected = this.store.getSelectedElements();

        // 1. Break generator link if selected (§4.3)
        selected.forEach(el => {
            if (el.params) {
                const pathD = elementToPathD(el);
                delete el.params;
                el.type = 'path';
                el.geometry = { d: pathD };
                console.log(`[NodeTool] Converted "${el.name || el.id}" from generator to path.`);
            }
        });

        // 2. Determine mode
        const pathEl = selected.find(el => el.type === 'path');
        if (pathEl) {
            this.mode = 'edit';
            this.activePathEl = pathEl;
            this.parsePathNodes(pathEl);
        } else {
            this.mode = 'draw';
            this.activePathEl = null;
            this.parsedNodes = [];
        }
        requestRender();
    }

    deactivate() {
        this.isDrawing = false;
        this.isEditingNode = false;
        this.previewEl = null;
        this.parsedNodes = [];
    }

    onPointerDown(pt, e) {
        if (this.mode === 'edit' && this.activePathEl) {
            const hit = this.hitTestNodes(pt);
            if (hit) {
                this.isEditingNode = true;
                this.activeNodeIndex = hit.index;
                this.activeHandleType = hit.type;
                this.dragStartNode = { ...this.parsedNodes[hit.index] };
                return;
            }
        }

        // Mode A: Draw curve
        this.isDrawing = true;
        this.start = { x: pt.x, y: pt.y };
        this.controlPoint = { x: pt.x, y: pt.y - 20 };
        this.endPoint = { x: pt.x, y: pt.y };

        const strokeColor = window.__vcDefaultStroke || '#007acc';
        const fillColor = window.__vcDefaultFill || 'none';

        this.previewEl = createElement('path', {
            d: `M 0 0 Q 0 -20 0 0`,
            style: { fill: fillColor, stroke: strokeColor, strokeWidth: 0.5 },
            transform: translationMatrix(pt.x, pt.y)
        });

        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);
        requestRender();
    }

    onPointerMove(pt) {
        if (this.isEditingNode && this.activePathEl) {
            const node = this.parsedNodes[this.activeNodeIndex];
            if (!node) return;

            const m = this.activePathEl.transform || [1, 0, 0, 1, 0, 0];
            const localX = pt.x - m[4];
            const localY = pt.y - m[5];

            if (this.activeHandleType === 'anchor') {
                node.x = localX;
                node.y = localY;
            } else if (this.activeHandleType === 'cp1') {
                node.cp1x = localX;
                node.cp1y = localY;
            } else if (this.activeHandleType === 'cp2') {
                node.cp2x = localX;
                node.cp2y = localY;
            }

            this.activePathEl.geometry.d = this.nodesToPathD(this.parsedNodes);
            requestRender();
            return;
        }

        if (!this.isDrawing || !this.previewEl) return;
        const dx = pt.x - this.start.x;
        const dy = pt.y - this.start.y;

        // Interactive curvature control: control point pulls perpendicular to end point
        const dist = Math.hypot(dx, dy);
        const perpX = dist > 0 ? (-dy / dist) * Math.min(60, dist * 0.5) : 0;
        const perpY = dist > 0 ? (dx / dist) * Math.min(60, dist * 0.5) : -20;

        const cx = dx / 2 + perpX;
        const cy = dy / 2 + perpY;

        this.previewEl.geometry.d = `M 0 0 Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)}`;
        requestRender();
    }

    onPointerUp() {
        if (this.isEditingNode) {
            this.isEditingNode = false;
            this.activeNodeIndex = -1;
            this.activeHandleType = null;
            requestRender();
            return;
        }

        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        const d = this.previewEl.geometry.d || '';
        if (d.includes('Q 0.00 -20.00 0.00 0.00') || d === 'M 0 0 Q 0 -20 0 0') {
            this.previewEl.geometry.d = 'M 0 0 Q 30 -30 60 0';
        }

        const finalEl = { ...this.previewEl };
        delete this.store.doc.elements[this.previewEl.id];
        const idx = this.store.doc.order.indexOf(this.previewEl.id);
        if (idx !== -1) this.store.doc.order.splice(idx, 1);

        this.store.dispatch(new AddElementCommand(finalEl));
        this.store.setSelection([finalEl.id]);
        this.previewEl = null;

        // Switch to edit mode on the newly placed curve
        this.mode = 'edit';
        this.activePathEl = finalEl;
        this.parsePathNodes(finalEl);
        requestRender();
    }

    parsePathNodes(pathEl) {
        const d = pathEl.geometry?.d || '';
        this.parsedNodes = [];
        const commands = d.match(/([MLCQZmlcqz][^MLCQZmlcqz]*)/g) || [];

        commands.forEach((seg, idx) => {
            const type = seg[0];
            const nums = seg.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            if (type === 'M' || type === 'L') {
                if (nums.length >= 2) {
                    this.parsedNodes.push({ type, x: nums[0], y: nums[1] });
                }
            } else if (type === 'Q') {
                if (nums.length >= 4) {
                    this.parsedNodes.push({ type: 'Q', cp1x: nums[0], cp1y: nums[1], x: nums[2], y: nums[3] });
                }
            } else if (type === 'C') {
                if (nums.length >= 6) {
                    this.parsedNodes.push({
                        type: 'C',
                        cp1x: nums[0], cp1y: nums[1],
                        cp2x: nums[2], cp2y: nums[3],
                        x: nums[4], y: nums[5]
                    });
                }
            } else if (type === 'Z' || type === 'z') {
                this.parsedNodes.push({ type: 'Z' });
            }
        });
    }

    nodesToPathD(nodes) {
        let d = '';
        nodes.forEach(n => {
            if (n.type === 'M') d += `M ${n.x.toFixed(2)} ${n.y.toFixed(2)} `;
            else if (n.type === 'L') d += `L ${n.x.toFixed(2)} ${n.y.toFixed(2)} `;
            else if (n.type === 'Q') d += `Q ${n.cp1x.toFixed(2)} ${n.cp1y.toFixed(2)} ${n.x.toFixed(2)} ${n.y.toFixed(2)} `;
            else if (n.type === 'C') d += `C ${n.cp1x.toFixed(2)} ${n.cp1y.toFixed(2)} ${n.cp2x.toFixed(2)} ${n.cp2y.toFixed(2)} ${n.x.toFixed(2)} ${n.y.toFixed(2)} `;
            else if (n.type === 'Z') d += `Z `;
        });
        return d.trim();
    }

    hitTestNodes(pt) {
        if (!this.activePathEl) return null;
        const m = this.activePathEl.transform || [1, 0, 0, 1, 0, 0];
        const localPt = { x: pt.x - m[4], y: pt.y - m[5] };
        const threshold = 8; // mm

        for (let i = 0; i < this.parsedNodes.length; i++) {
            const n = this.parsedNodes[i];
            if (n.x !== undefined && Math.hypot(localPt.x - n.x, localPt.y - n.y) < threshold) {
                return { index: i, type: 'anchor' };
            }
            if (n.cp1x !== undefined && Math.hypot(localPt.x - n.cp1x, localPt.y - n.cp1y) < threshold) {
                return { index: i, type: 'cp1' };
            }
            if (n.cp2x !== undefined && Math.hypot(localPt.x - n.cp2x, localPt.y - n.cp2y) < threshold) {
                return { index: i, type: 'cp2' };
            }
        }
        return null;
    }
}
