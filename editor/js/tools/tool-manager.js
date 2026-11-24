/**
 * VectorCutter - Tool Manager
 * Dispatches pointer events to the active tool and drives live 60 FPS interaction (§1.4).
 */

import { events } from '../core/events.js';
import { requestRender } from '../core/scheduler.js';
import { getElementLocalBounds, getTransformedCorners, getRotationCentre } from '../model/bounds.js';
import { SelectTool } from './select.js';
import { PanTool } from './pan.js';
import { RectTool } from './rect.js';
import { CircleTool } from './circle.js';
import { EllipseTool } from './ellipse.js';
import { PolygonTool } from './polygon.js';
import { StarTool } from './star.js';
import { LineTool } from './line.js';
import { PenTool } from './pen.js';
import { NodeTool } from './node.js';
import { TextTool } from './text.js';

export class ToolManager {
    constructor(canvasContainer, camera, store) {
        this.container = canvasContainer;
        this.camera = camera;
        this.store = store;

        this.tools = {
            'select': new SelectTool(camera, store),
            'pan': new PanTool(camera),
            'rectangle': new RectTool(camera, store),
            'circle': new CircleTool(camera, store),
            'ellipse': new EllipseTool(camera, store),
            'polygon': new PolygonTool(camera, store),
            'star': new StarTool(camera, store),
            'line': new LineTool(camera, store),
            'path': new PenTool(camera, store),
            'curve': new NodeTool(camera, store),
            'text': new TextTool(camera, store)
        };

        this.currentTool = 'select';
        this.bindEvents();
    }

    setTool(toolName) {
        if (!this.tools[toolName]) return;
        if (this.tools[this.currentTool]?.deactivate) {
            this.tools[this.currentTool].deactivate();
        }
        this.currentTool = toolName;
        if (this.tools[this.currentTool]?.activate) {
            this.tools[this.currentTool].activate();
        }
        events.emit('tool:changed', this.currentTool);
        requestRender();
    }

    bindEvents() {
        this.container.addEventListener('pointerdown', (e) => {
            if (e.button === 1 || this.container.classList.contains('space-pan')) return;

            // Never process drawing tools when clicking on quickbar or floating bars
            if (e.target.closest('#quickbar') || e.target.closest('.vc-quickbar') || e.target.closest('.vc-tool-options-bar')) {
                return;
            }

            try {
                this.container.setPointerCapture(e.pointerId);
            } catch (err) {}
            const pt = this.getEventPoint(e);
            this.tools[this.currentTool]?.onPointerDown(pt, e);
            requestRender();
        });

        window.addEventListener('pointermove', (e) => {
            if (this.container.classList.contains('is-panning')) return;

            // Ignore pointermove over quickbar if not actively dragging a tool
            if (!this.container.hasPointerCapture(e.pointerId) && (e.target.closest('#quickbar') || e.target.closest('.vc-quickbar'))) {
                return;
            }

            const pt = this.getEventPoint(e);
            this.tools[this.currentTool]?.onPointerMove(pt, e);
            requestRender();
        });

        window.addEventListener('pointerup', (e) => {
            try {
                this.container.releasePointerCapture(e.pointerId);
            } catch (err) {}

            const pt = this.getEventPoint(e);
            this.tools[this.currentTool]?.onPointerUp(pt, e);
            requestRender();
        });
    }

    getEventPoint(e) {
        const rect = this.container.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = this.camera.toWorld(sx, sy);

        let wx = world.x;
        let wy = world.y;

        // Apply Snap / Magnet mode
        const snapMode = window.__vcSnapMode || 'none';
        if (snapMode === 'grid') {
            const snapStep = 10; // 10 mm
            wx = Math.round(wx / snapStep) * snapStep;
            wy = Math.round(wy / snapStep) * snapStep;
        } else if (snapMode === 'geometry') {
            const snapped = this.snapToGeometry(world.x, world.y);
            wx = snapped.x;
            wy = snapped.y;
        }

        return {
            screenX: sx,
            screenY: sy,
            clientX: e.clientX,
            clientY: e.clientY,
            x: wx,
            y: wy,
            rawX: world.x,
            rawY: world.y
        };
    }

    snapToGeometry(x, y) {
        const threshold = 14 / this.camera.scale; // ~14 screen pixels tolerance
        let closestDist = threshold;
        let bestX = x;
        let bestY = y;

        const elements = this.store.doc.elements || {};
        for (const id in elements) {
            const el = elements[id];
            if (!el || el.visible === false) continue;
            const b = getElementLocalBounds(el);
            const corners = getTransformedCorners(b, el.transform || [1, 0, 0, 1, 0, 0]);
            const center = getRotationCentre(el);
            const candidatePoints = [...corners, center];

            for (const pt of candidatePoints) {
                const dist = Math.hypot(pt.x - x, pt.y - y);
                if (dist < closestDist) {
                    closestDist = dist;
                    bestX = pt.x;
                    bestY = pt.y;
                }
            }
        }
        return { x: bestX, y: bestY };
    }
}
