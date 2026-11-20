/**
 * VectorCutter - Floating Quick-Tools Bar
 */

import { events } from '../core/events.js';
import { rotationMatrix, scaleMatrix, multiplyMatrix, translationMatrix } from '../model/matrix.js';
import { TransformElementsCommand, DeleteElementsCommand, AddElementCommand } from '../core/commands.js';
import { getElementLocalBounds } from '../model/bounds.js';

export class QuickbarController {
    constructor(quickbarEl, toolManager, store) {
        this.quickbar = quickbarEl;
        this.toolManager = toolManager;
        this.store = store;

        this.bindEvents();
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

    rotateSelection(deg) {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        const transforms = [];
        selected.forEach(el => {
            const box = getElementLocalBounds(el);
            const cx = el.transform[4] + box.width / 2;
            const cy = el.transform[5] + box.height / 2;
            const rot = rotationMatrix(deg, cx, cy);
            transforms.push({
                id: el.id,
                before: [...el.transform],
                after: multiplyMatrix(rot, el.transform)
            });
        });

        this.store.dispatch(new TransformElementsCommand(transforms));
    }

    flipSelection(direction) {
        const selected = this.store.getSelectedElements();
        if (selected.length === 0) return;

        const transforms = [];
        selected.forEach(el => {
            const box = getElementLocalBounds(el);
            const cx = el.transform[4] + box.width / 2;
            const cy = el.transform[5] + box.height / 2;
            const scale = direction === 'h' ? scaleMatrix(-1, 1, cx, cy) : scaleMatrix(1, -1, cx, cy);
            transforms.push({
                id: el.id,
                before: [...el.transform],
                after: multiplyMatrix(scale, el.transform)
            });
        });

        this.store.dispatch(new TransformElementsCommand(transforms));
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
    }

    deleteSelection() {
        if (this.store.doc.selection.length === 0) return;
        this.store.dispatch(new DeleteElementsCommand(this.store.doc.selection, this.store.doc));
    }
}
