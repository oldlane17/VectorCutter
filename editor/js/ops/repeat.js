/**
 * VectorCutter - Repeat Pattern Operations (Linear, Rotational, Grid, Mirror)
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand } from '../core/commands.js';
import { translationMatrix, rotationMatrix, scaleMatrix, multiplyMatrix } from '../model/matrix.js';
import { getElementLocalBounds } from '../model/bounds.js';

export function linearRepeat(store, count = 5, dxMm = 15, dyMm = 0) {
    const selected = store.getSelectedElements();
    if (selected.length === 0) {
        alert('Select at least one element to repeat.');
        return;
    }

    const newIds = [];
    store.beginBatch();

    selected.forEach(el => {
        for (let i = 1; i < count; i++) {
            const clone = JSON.parse(JSON.stringify(el));
            clone.id = `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            clone.name = `${el.name} (${i + 1})`;
            const move = translationMatrix(dxMm * i, dyMm * i);
            clone.transform = multiplyMatrix(move, el.transform);
            store.dispatch(new AddElementCommand(clone));
            newIds.push(clone.id);
        }
    });

    store.endBatch('Linear Repeat');
    store.setSelection(newIds);
}

export function rotationalRepeat(store, count = 6, radiusMm = 40) {
    const selected = store.getSelectedElements();
    if (selected.length === 0) return;

    const newIds = [];
    store.beginBatch();

    selected.forEach(el => {
        const box = getElementLocalBounds(el);
        const originX = el.transform[4] + box.width / 2;
        const originY = el.transform[5] + box.height / 2 + radiusMm;

        for (let i = 1; i < count; i++) {
            const angle = (360 / count) * i;
            const clone = JSON.parse(JSON.stringify(el));
            clone.id = `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            clone.name = `${el.name} (Rot ${i + 1})`;

            const rot = rotationMatrix(angle, originX, originY);
            clone.transform = multiplyMatrix(rot, el.transform);
            store.dispatch(new AddElementCommand(clone));
            newIds.push(clone.id);
        }
    });

    store.endBatch('Rotational Repeat');
    store.setSelection(newIds);
}

export function gridRepeat(store, cols = 3, rows = 3, spacingX = 20, spacingY = 20) {
    const selected = store.getSelectedElements();
    if (selected.length === 0) return;

    const newIds = [];
    store.beginBatch();

    selected.forEach(el => {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 && c === 0) continue; // Original is at (0, 0)
                const clone = JSON.parse(JSON.stringify(el));
                clone.id = `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                clone.name = `${el.name} [${r},${c}]`;

                const move = translationMatrix(c * spacingX, r * spacingY);
                clone.transform = multiplyMatrix(move, el.transform);
                store.dispatch(new AddElementCommand(clone));
                newIds.push(clone.id);
            }
        }
    });

    store.endBatch('Grid Repeat');
    store.setSelection(newIds);
}

export function mirrorRepeat(store, axis = 'horizontal') {
    const selected = store.getSelectedElements();
    if (selected.length === 0) return;

    const newIds = [];
    store.beginBatch();

    selected.forEach(el => {
        const box = getElementLocalBounds(el);
        const cx = el.transform[4] + box.width / 2;
        const cy = el.transform[5] + box.height / 2;

        const clone = JSON.parse(JSON.stringify(el));
        clone.id = `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        clone.name = `${el.name} (Mirror)`;

        const scale = axis === 'horizontal'
            ? multiplyMatrix(translationMatrix(box.width + 10, 0), scaleMatrix(-1, 1, cx, cy))
            : multiplyMatrix(translationMatrix(0, box.height + 10), scaleMatrix(1, -1, cx, cy));

        clone.transform = multiplyMatrix(scale, el.transform);
        store.dispatch(new AddElementCommand(clone));
        newIds.push(clone.id);
    });

    store.endBatch('Mirror Repeat');
    store.setSelection(newIds);
}
