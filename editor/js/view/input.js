/**
 * VectorCutter - View Input Controller
 * Normalized Mouse, Wheel, Trackpad, Touch & Keyboard Camera navigation.
 */

import { storage } from '../core/storage.js';
import { events } from '../core/events.js';

export class InputController {
    constructor(containerEl, camera, toolManager) {
        this.container = containerEl;
        this.camera = camera;
        this.toolManager = toolManager;

        this.scrollMode = storage.getItem('vc_scroll_mode', 'trackpad');
        this.isSpacePressed = false;
        this.isMiddleDragging = false;
        this.lastPointer = { x: 0, y: 0 };

        this.bindEvents();
    }

    setScrollMode(mode) {
        this.scrollMode = mode === 'mouse' ? 'mouse' : 'trackpad';
        storage.setItem('vc_scroll_mode', this.scrollMode);
        events.emit('scrollmode:changed', this.scrollMode);
    }

    bindEvents() {
        // Space key pan trigger
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
                this.isSpacePressed = true;
                this.container.classList.add('space-pan');
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isSpacePressed = false;
                this.container.classList.remove('space-pan');
            }
        });

        // Wheel / Trackpad listener
        this.container.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Pointer events for panning
        this.container.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        window.addEventListener('pointerup', (e) => this.handlePointerUp(e));

        // Touch pinch-zoom
        this.setupTouchGestures();
    }

    handleWheel(e) {
        e.preventDefault();
        e.stopPropagation();

        const rect = this.container.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        // Normalise delta values
        let dx = e.deltaX;
        let dy = e.deltaY;
        if (e.deltaMode === 1) { // Line mode
            dx *= 16;
            dy *= 16;
        } else if (e.deltaMode === 2) { // Page mode
            dx *= rect.width;
            dy *= rect.height;
        }

        const isPinchZoom = e.ctrlKey || e.metaKey;

        if (this.scrollMode === 'trackpad') {
            if (isPinchZoom) {
                // Pinch to zoom around cursor
                const zoomFactor = Math.pow(2, -dy * 0.01);
                this.camera.zoomAt(sx, sy, zoomFactor);
            } else if (e.shiftKey) {
                // Horizontal pan
                this.camera.panBy(dy !== 0 ? dy : dx, 0);
            } else {
                // Two-finger pan in both directions
                this.camera.panBy(dx, dy);
            }
        } else {
            // Mouse Mode
            if (isPinchZoom || (!e.shiftKey && !e.altKey && dx === 0)) {
                // Mouse wheel zooms towards cursor
                const factor = dy < 0 ? 1.15 : 0.87;
                this.camera.zoomAt(sx, sy, factor);
            } else if (e.shiftKey) {
                this.camera.panBy(dy !== 0 ? dy : dx, 0);
            } else if (e.altKey) {
                this.camera.panBy(0, dy !== 0 ? dy : dx);
            } else if (dx !== 0) {
                // Horizontal scrollwheel never zooms
                this.camera.panBy(dx, 0);
            }
        }
    }

    handlePointerDown(e) {
        if (e.button === 1 || this.isSpacePressed || (this.toolManager && this.toolManager.currentTool === 'pan')) {
            e.preventDefault();
            this.isMiddleDragging = true;
            this.lastPointer = { x: e.clientX, y: e.clientY };
            this.container.classList.add('is-panning');
        }
    }

    handlePointerMove(e) {
        if (this.isMiddleDragging) {
            e.preventDefault();
            const dx = e.clientX - this.lastPointer.x;
            const dy = e.clientY - this.lastPointer.y;
            this.camera.panBy(dx, dy);
            this.lastPointer = { x: e.clientX, y: e.clientY };
        }
    }

    handlePointerUp(e) {
        if (this.isMiddleDragging) {
            this.isMiddleDragging = false;
            this.container.classList.remove('is-panning');
        }
    }

    setupTouchGestures() {
        let touchStartDist = null;
        let touchStartCenter = null;

        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                touchStartCenter = {
                    x: (t1.clientX + t2.clientX) / 2,
                    y: (t1.clientY + t2.clientY) / 2
                };
            }
        }, { passive: false });

        this.container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && touchStartDist && touchStartCenter) {
                e.preventDefault();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                const curCenter = {
                    x: (t1.clientX + t2.clientX) / 2,
                    y: (t1.clientY + t2.clientY) / 2
                };

                const rect = this.container.getBoundingClientRect();
                const sx = curCenter.x - rect.left;
                const sy = curCenter.y - rect.top;

                // Zoom factor
                const scaleFactor = curDist / touchStartDist;
                this.camera.zoomAt(sx, sy, scaleFactor);

                // Pan factor
                const panDx = curCenter.x - touchStartCenter.x;
                const panDy = curCenter.y - touchStartCenter.y;
                this.camera.panBy(panDx, panDy);

                touchStartDist = curDist;
                touchStartCenter = curCenter;
            }
        }, { passive: false });

        this.container.addEventListener('touchend', () => {
            touchStartDist = null;
            touchStartCenter = null;
        });
    }
}
