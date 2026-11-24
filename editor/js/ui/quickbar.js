/**
 * VectorCutter - Floating Quick-Tools Bar
 */

import { events } from '../core/events.js';
import { rotationMatrix, scaleMatrix, multiplyMatrix, translationMatrix } from '../model/matrix.js';
import { TransformElementsCommand, DeleteElementsCommand, AddElementCommand, UpdateElementPropsCommand } from '../core/commands.js';
import { getElementLocalBounds, getRotationCentre } from '../model/bounds.js';
import { requestRender } from '../core/scheduler.js';

export class QuickbarController {
    constructor(quickbarEl, toolManager, store) {
        this.quickbar = quickbarEl;
        this.toolManager = toolManager;
        this.store = store;

        // Prevent ANY click or pointerdown inside quickbar from bubbling to canvas
        ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(evt => {
            this.quickbar.addEventListener(evt, (e) => {
                e.stopPropagation();
            });
        });

        this.bindEvents();
        this.bindToolBehaviourControls();
        this.updateState();
    }

    updateState() {
        const hasSelection = this.store.doc.selection.length > 0;
        this.quickbar.querySelectorAll('.selection-action').forEach(btn => {
            btn.disabled = !hasSelection;
            btn.style.opacity = hasSelection ? '1' : '0.4';
            btn.style.pointerEvents = hasSelection ? 'auto' : 'none';
        });

        // Tool switches active indicator
        this.quickbar.querySelectorAll('[data-quick-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.quickTool === this.toolManager.currentTool);
        });
    }

    bindEvents() {
        // Tool switches
        this.quickbar.querySelectorAll('[data-quick-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.toolManager.setTool(btn.dataset.quickTool);
            });
        });

        // Rotate 90 CW / CCW
        const btnCW = document.getElementById('quickRotateCW');
        if (btnCW) btnCW.addEventListener('click', () => this.rotateSelection(90));

        const btnCCW = document.getElementById('quickRotateCCW');
        if (btnCCW) btnCCW.addEventListener('click', () => this.rotateSelection(-90));

        const btn180 = document.getElementById('quick180') || document.getElementById('quickRotate180');
        if (btn180) btn180.addEventListener('click', () => this.rotateSelection(180));

        // Flip H / V
        const btnFlipH = document.getElementById('quickFlipH');
        if (btnFlipH) btnFlipH.addEventListener('click', () => this.flipSelection('h'));

        const btnFlipV = document.getElementById('quickFlipV');
        if (btnFlipV) btnFlipV.addEventListener('click', () => this.flipSelection('v'));

        // Duplicate
        const btnDup = document.getElementById('quickDuplicate');
        if (btnDup) btnDup.addEventListener('click', () => this.duplicateSelection());

        // Delete
        const btnDel = document.getElementById('quickDelete');
        if (btnDel) btnDel.addEventListener('click', () => this.deleteSelection());

        // Listen for store & tool changes
        events.on('selection:changed', () => this.updateState());
        events.on('tool:changed', () => this.updateState());
    }

    bindToolBehaviourControls() {
        // --- 1. Selection Mode (Rect / Lasso) ---
        this.quickbar.querySelectorAll('[data-sel-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.quickbar.querySelectorAll('[data-sel-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.__vcSelectionMode = btn.dataset.selMode; // 'rect' | 'lasso'
            });
        });

        // --- 2. Snap Mode (Grid / Geometry / None) ---
        this.quickbar.querySelectorAll('[data-snap]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.quickbar.querySelectorAll('[data-snap]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.__vcSnapMode = btn.dataset.snap; // 'grid' | 'geometry' | 'none'
                events.emit('snap:changed', window.__vcSnapMode);
            });
        });

        // --- 3. Quick Color Picks (Stroke & Fill) ---
        const strokeBtn = document.getElementById('qbStrokeColor');
        const fillBtn = document.getElementById('qbFillColor');

        if (strokeBtn) {
            strokeBtn.addEventListener('click', () => {
                const inp = document.createElement('input');
                inp.type = 'color';
                inp.value = window.__vcDefaultStroke || '#007acc';
                inp.style.position = 'fixed';
                inp.style.opacity = '0';
                document.body.appendChild(inp);
                inp.click();
                inp.addEventListener('input', () => {
                    const col = inp.value;
                    window.__vcDefaultStroke = col;
                    const prev = document.getElementById('qbStrokePreview');
                    if (prev) prev.style.background = col;

                    const sel = this.store.getSelectedElements();
                    if (sel.length > 0) {
                        this.store.commit('Change Stroke Color', doc => {
                            sel.forEach(el => {
                                if (doc.elements[el.id]) {
                                    doc.elements[el.id].style.stroke = col;
                                }
                            });
                        });
                        requestRender();
                    }
                });
                inp.addEventListener('change', () => inp.remove());
            });
        }

        if (fillBtn) {
            fillBtn.addEventListener('click', () => {
                const inp = document.createElement('input');
                inp.type = 'color';
                inp.value = window.__vcDefaultFill || '#007acc';
                inp.style.position = 'fixed';
                inp.style.opacity = '0';
                document.body.appendChild(inp);
                inp.click();
                inp.addEventListener('input', () => {
                    const col = inp.value;
                    window.__vcDefaultFill = col;
                    const prev = document.getElementById('qbFillPreview');
                    if (prev) prev.style.background = col;

                    const sel = this.store.getSelectedElements();
                    if (sel.length > 0) {
                        this.store.commit('Change Fill Color', doc => {
                            sel.forEach(el => {
                                if (doc.elements[el.id]) {
                                    doc.elements[el.id].style.fill = col;
                                }
                            });
                        });
                        requestRender();
                    }
                });
                inp.addEventListener('change', () => inp.remove());
            });
        }
    }

    rotateSelection(deg) {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        const transforms = [];
        selected.forEach(el => {
            if (el.locked) return;
            const { x: cx, y: cy } = getRotationCentre(el);
            const rot = rotationMatrix(deg, cx, cy);
            transforms.push({
                id: el.id,
                before: [...el.transform],
                after: multiplyMatrix(rot, el.transform)
            });
        });

        if (transforms.length > 0) {
            this.store.dispatch(new TransformElementsCommand(transforms));
            requestRender();
        }
    }

    flipSelection(direction) {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        const transforms = [];
        selected.forEach(el => {
            if (el.locked) return;
            const { x: cx, y: cy } = getRotationCentre(el);
            const scale = direction === 'h' ? scaleMatrix(-1, 1, cx, cy) : scaleMatrix(1, -1, cx, cy);
            transforms.push({
                id: el.id,
                before: [...el.transform],
                after: multiplyMatrix(scale, el.transform)
            });
        });

        if (transforms.length > 0) {
            this.store.dispatch(new TransformElementsCommand(transforms));
            requestRender();
        }
    }

    duplicateSelection() {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        const newIds = [];
        this.store.beginBatch();
        selected.forEach(el => {
            const cloned = JSON.parse(JSON.stringify(el));
            cloned.id = `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            cloned.name = `${el.name} (Copy)`;
            // Offset slightly by 10mm
            cloned.transform = multiplyMatrix(translationMatrix(10, 10), el.transform);
            this.store.dispatch(new AddElementCommand(cloned));
            newIds.push(cloned.id);
        });
        this.store.endBatch('Duplicate Elements');
        this.store.setSelection(newIds);
        requestRender();
    }

    deleteSelection() {
        if (this.store.doc.selection.length === 0) return;
        const unlocked = this.store.doc.selection.filter(id => {
            const el = this.store.getElement(id);
            return el && !el.locked;
        });
        if (unlocked.length > 0) {
            this.store.dispatch(new DeleteElementsCommand(unlocked, this.store.doc));
            this.store.clearSelection();
            requestRender();
        }
    }
}
