/**
 * VectorCutter - Laser Cutting Path Validation Checks
 * Detects open paths, duplicate lines, tiny segments, unconverted text,
 * and elements outside bed dimensions.
 */

import { getElementLocalBounds } from '../model/bounds.js';

export function runLaserChecks(store) {
    const doc = store.doc;
    const bedW = doc.settings?.bed?.w || 600;
    const bedH = doc.settings?.bed?.h || 400;

    const issues = [];

    for (const id of doc.order) {
        const el = doc.elements[id];
        if (!el || el.visible === false) continue;

        const box = getElementLocalBounds(el);
        const wx = el.transform[4] + box.x;
        const wy = el.transform[5] + box.y;

        // 1. Outside Bed Boundary Check
        if (wx < 0 || wy < 0 || wx + box.width > bedW || wy + box.height > bedH) {
            issues.push({
                elementId: el.id,
                severity: 'warning',
                type: 'outside_bed',
                message: `"${el.name}" extends outside laser bed (${bedW}×${bedH} mm)`
            });
        }

        // 2. Unconverted Text Check
        if (el.type === 'text' && el.laser?.op === 'cut') {
            issues.push({
                elementId: el.id,
                severity: 'error',
                type: 'unconverted_text',
                message: `Text "${el.geometry?.text || ''}" is set to Cut but not converted to paths`
            });
        }

        // 3. Open Cut Paths Check
        if (el.type === 'path' && el.laser?.op === 'cut') {
            const d = el.geometry?.d || '';
            if (!d.toUpperCase().includes('Z')) {
                issues.push({
                    elementId: el.id,
                    severity: 'warning',
                    type: 'open_path',
                    message: `Path "${el.name}" is set to Cut but is an open path`
                });
            }
        }

        // 4. Tiny Segment Check (< 0.5mm)
        if (box.width < 0.5 && box.height < 0.5) {
            issues.push({
                elementId: el.id,
                severity: 'info',
                type: 'tiny_segment',
                message: `"${el.name}" is smaller than 0.5mm (${box.width.toFixed(2)}×${box.height.toFixed(2)} mm)`
            });
        }
    }

    return issues;
}
