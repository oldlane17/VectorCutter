/**
 * VectorCutter - Kerf Compensation & Outline Stroke
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand, UpdateElementPropsCommand } from '../core/commands.js';
import { elementToPathD } from './boolean.js';

export function applyKerfOffset(store, offsetMm = null) {
    const selected = store.getSelectedElements();
    if (selected.length === 0) {
        alert('Select an element to apply Kerf Offset.');
        return;
    }

    if (offsetMm === null) {
        const input = prompt('Kerf offset in mm (positive for outset, negative for inset):', '0.15');
        if (!input) return;
        offsetMm = parseFloat(input);
        if (isNaN(offsetMm)) return;
    }

    selected.forEach(el => {
        if (el.type === 'rect') {
            const before = { geometry: { ...el.geometry } };
            el.geometry.x -= offsetMm;
            el.geometry.y -= offsetMm;
            el.geometry.width += offsetMm * 2;
            el.geometry.height += offsetMm * 2;
            const after = { geometry: { ...el.geometry } };
            store.dispatch(new UpdateElementPropsCommand(el.id, before, after));
        } else if (el.type === 'circle') {
            const before = { geometry: { ...el.geometry } };
            el.geometry.r = Math.max(0.5, el.geometry.r + offsetMm);
            const after = { geometry: { ...el.geometry } };
            store.dispatch(new UpdateElementPropsCommand(el.id, before, after));
        } else if (el.type === 'ellipse') {
            const before = { geometry: { ...el.geometry } };
            el.geometry.rx = Math.max(0.5, el.geometry.rx + offsetMm);
            el.geometry.ry = Math.max(0.5, el.geometry.ry + offsetMm);
            const after = { geometry: { ...el.geometry } };
            store.dispatch(new UpdateElementPropsCommand(el.id, before, after));
        }
    });
}

export function outlineStroke(store) {
    const selected = store.getSelectedElements();
    if (selected.length === 0) return;

    selected.forEach(el => {
        const strokeW = el.style.strokeWidth || 0.5;
        const d = elementToPathD(el);

        const outlineEl = createElement('path', {
            d,
            name: `${el.name} (Outline)`,
            transform: [...el.transform],
            style: {
                fill: 'none',
                stroke: el.style.stroke || '#000000',
                strokeWidth: strokeW
            },
            laser: { op: 'cut' }
        });

        store.dispatch(new AddElementCommand(outlineEl));
    });
}
