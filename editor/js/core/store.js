/**
 * VectorCutter - Central Document Store
 * Single source of truth for all components, views and tools.
 */

import { createInitialDocument } from '../model/document.js';
import { History } from './history.js';
import { events } from './events.js';

export class Store {
    constructor(initialDoc = null) {
        this.doc = initialDoc || createInitialDocument();
        this.history = new History(250);
        this.isBatching = false;
        this.batchCommands = [];
    }

    dispatch(command) {
        if (this.isBatching) {
            this.batchCommands.push(command);
            const res = command.do(this.doc);
            return res;
        }

        const res = command.do(this.doc);
        this.history.push(command);
        events.emit('document:changed', { changedIds: res?.changedIds || [], action: 'dispatch' });
        return res;
    }

    beginBatch() {
        this.isBatching = true;
        this.batchCommands = [];
    }

    endBatch(name = 'Batch Action') {
        this.isBatching = false;
        if (this.batchCommands.length === 0) return;

        // Combine into one history entry
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
    }

    undo() {
        const res = this.history.undo(this.doc);
        if (res) {
            events.emit('document:changed', { changedIds: res.changedIds || [], action: 'undo' });
            events.emit('selection:changed', { selection: [...this.doc.selection] });
        }
        return res;
    }

    redo() {
        const res = this.history.redo(this.doc);
        if (res) {
            events.emit('document:changed', { changedIds: res.changedIds || [], action: 'redo' });
            events.emit('selection:changed', { selection: [...this.doc.selection] });
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
        return this.doc.order.map(id => this.doc.elements[id]).filter(Boolean);
    }

    replaceDocument(newDoc) {
        this.doc = newDoc;
        this.history.clear();
        events.emit('document:loaded', { doc: this.doc });
        events.emit('document:changed', { action: 'load' });
        events.emit('selection:changed', { selection: [...this.doc.selection] });
    }
}
