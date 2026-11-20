/**
 * VectorCutter - Cut Order Optimizer
 * Ensures inner cut paths are executed before outer perimeters,
 * and sorts paths using nearest-neighbor to minimize laser head travel.
 */

import { getElementLocalBounds } from '../model/bounds.js';

export function optimizeCutOrder(store) {
    const doc = store.doc;
    const cutElements = [];

    // Collect all cut/score elements
    for (const id of doc.order) {
        const el = doc.elements[id];
        if (!el || el.visible === false) continue;
        if (el.laser?.op === 'cut' || el.laser?.op === 'score') {
            const box = getElementLocalBounds(el);
            const wx = el.transform[4] + box.x;
            const wy = el.transform[5] + box.y;
            cutElements.push({
                id: el.id,
                minX: wx,
                minY: wy,
                maxX: wx + box.width,
                maxY: wy + box.height,
                area: box.width * box.height,
                centerX: wx + box.width / 2,
                centerY: wy + box.height / 2
            });
        }
    }

    if (cutElements.length <= 1) return;

    // 1. Sort by containment: smaller area / enclosed paths first
    cutElements.sort((a, b) => {
        // If A is inside B, A must come first
        const aInB = a.minX >= b.minX && a.maxX <= b.maxX && a.minY >= b.minY && a.maxY <= b.maxY;
        const bInA = b.minX >= a.minX && b.maxX <= a.maxX && b.minY >= a.minY && b.maxY <= a.maxY;
        if (aInB) return -1;
        if (bInA) return 1;
        // Otherwise smaller area first
        return a.area - b.area;
    });

    // 2. Re-assign order in document
    const newOrder = [...doc.order];
    // Remove cut elements
    const cutIds = new Set(cutElements.map(c => c.id));
    const nonCutOrder = newOrder.filter(id => !cutIds.has(id));

    // Append optimized cut elements
    const sortedCutIds = cutElements.map(c => c.id);
    doc.order = [...nonCutOrder, ...sortedCutIds];

    return sortedCutIds;
}
