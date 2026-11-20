/**
 * VectorCutter - Central Document Store
 * Single source of truth for all components, views, tools, and 3D pipelines.
 */

import { createInitialDocument } from '../model/document.js';
import { History } from './history.js';
import { events } from './events.js';
import { requestRender } from './scheduler.js';

export class Store {
    constructor(initialDoc = null) {
        this.doc = initialDoc || createInitialDocument();
        this.history = new History(250);
        this.isBatching = false;
        this.batchCommands = [];
    }

    /**
     * Unified Mutation Gateway (§1.2)
     * Pushes an undo snapshot, applies mutation, schedules render, emits event.
     */
    commit(label, mutatorFn) {
        // Deep clone current state for undo
        const beforeElements = JSON.parse(JSON.stringify(this.doc.elements));
        const beforeOrder = [...this.doc.order];
        const beforeSelection = [...this.doc.selection];

        mutatorFn(this.doc);

        const afterElements = JSON.parse(JSON.stringify(this.doc.elements));
        const afterOrder = [...this.doc.order];
        const afterSelection = [...this.doc.selection];

        const cmd = {
            name: label,
            do: (doc) => {
                doc.elements = JSON.parse(JSON.stringify(afterElements));
                doc.order = [...afterOrder];
                doc.selection = [...afterSelection];
                return { changedIds: Object.keys(afterElements) };
            },
            undo: (doc) => {
                doc.elements = JSON.parse(JSON.stringify(beforeElements));
                doc.order = [...beforeOrder];
                doc.selection = [...beforeSelection];
                return { changedIds: Object.keys(beforeElements) };
            }
        };

        if (this.isBatching) {
            this.batchCommands.push(cmd);
        } else {
            this.history.push(cmd);
        }

        events.emit('document:changed', { action: 'commit', label });
        requestRender();
    }

    dispatch(command) {
        if (this.isBatching) {
            this.batchCommands.push(command);
            const res = command.do(this.doc);
            requestRender();
            return res;
        }

        const res = command.do(this.doc);
        this.history.push(command);
        events.emit('document:changed', { changedIds: res?.changedIds || [], action: 'dispatch' });
        requestRender();
        return res;
    }

    beginBatch() {
        this.isBatching = true;
        this.batchCommands = [];
    }

    endBatch(name = 'Batch Action') {
        this.isBatching = false;
        if (this.batchCommands.length === 0) return;

        const batchCmd = {
            name,
            commands: [...this.batchCommands],
            do: (doc) => {
                const changed = new Set();
                this.batchCommands.forEach(c => {
                    const r = c.do(doc);
                    if (r?.changedIds) r.changedIds.forEach(id => changed.add(id));
                });
                return { changedIds: Array.from(changed) };
            },
            undo: (doc) => {
                const changed = new Set();
                for (let i = this.batchCommands.length - 1; i >= 0; i--) {
                    const r = this.batchCommands[i].undo(doc);
                    if (r?.changedIds) r.changedIds.forEach(id => changed.add(id));
                }
                return { changedIds: Array.from(changed) };
            }
        };

        this.history.push(batchCmd);
        this.batchCommands = [];
        events.emit('document:changed', { action: 'batch-end' });
        requestRender();
    }

    undo() {
        const res = this.history.undo(this.doc);
        if (res) {
            events.emit('document:changed', { changedIds: res.changedIds || [], action: 'undo' });
            events.emit('selection:changed', { selection: [...this.doc.selection] });
            requestRender();
        }
        return res;
    }

    redo() {
        const res = this.history.redo(this.doc);
        if (res) {
            events.emit('document:changed', { changedIds: res.changedIds || [], action: 'redo' });
            events.emit('selection:changed', { selection: [...this.doc.selection] });
            requestRender();
        }
        return res;
    }

    setSelection(ids) {
        const newSel = Array.isArray(ids) ? ids.filter(id => !!this.doc.elements[id]) : [];
        const isSame = newSel.length === this.doc.selection.length &&
            newSel.every((id, idx) => id === this.doc.selection[idx]);
        if (isSame) return;

        this.doc.selection = newSel;
        events.emit('selection:changed', { selection: [...this.doc.selection] });
        requestRender();
    }

    clearSelection() {
        this.setSelection([]);
    }

    getSelectedElements() {
        return this.doc.selection
            .map(id => this.doc.elements[id])
            .filter(Boolean);
    }

    getElement(id) {
        return this.doc.elements[id] || null;
    }

    getAllElements() {
        return this.doc.order
            .map(id => this.doc.elements[id])
            .filter(Boolean);
    }

    replaceDocument(newDoc) {
        this.doc = newDoc;
        this.history.clear();
        events.emit('document:changed', { action: 'replace' });
        events.emit('selection:changed', { selection: [...this.doc.selection] });
        requestRender();
    }
}
