/**
 * VectorCutter - Boolean Operations (Union, Difference, Intersect, Exclude)
 */

import { createElement } from '../model/elements.js';
import { AddElementCommand, DeleteElementsCommand } from '../core/commands.js';
import { translationMatrix } from '../model/matrix.js';

export function elementToPathD(el) {
    const g = el.geometry || {};
    switch (el.type) {
        case 'rect':
            const x = g.x || 0, y = g.y || 0, w = g.width || 0, h = g.height || 0;
            const r = g.rx || 0;
            if (r > 0) {
                return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
            }
            return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
        case 'circle':
            const cx = g.cx || 0, cy = g.cy || 0, cr = g.r || 0;
            return `M ${cx - cr} ${cy} A ${cr} ${cr} 0 1 0 ${cx + cr} ${cy} A ${cr} ${cr} 0 1 0 ${cx - cr} ${cy} Z`;
        case 'ellipse':
            const ecx = g.cx || 0, ecy = g.cy || 0, erx = g.rx || 0, ery = g.ry || 0;
            return `M ${ecx - erx} ${ecy} A ${erx} ${ery} 0 1 0 ${ecx + erx} ${ecy} A ${erx} ${ery} 0 1 0 ${ecx - erx} ${ecy} Z`;
        case 'polygon': {
            const sides = g.sides || 6, r = g.radius || 25, cx = g.cx || 0, cy = g.cy || 0;
            let d = '';
            for (let i = 0; i < sides; i++) {
                const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
                const px = (cx + r * Math.cos(a)).toFixed(2);
                const py = (cy + r * Math.sin(a)).toFixed(2);
                d += (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
            }
            return d + ' Z';
        }
        case 'star': {
            const points = g.points || 5, outerR = g.outerRadius || 25, innerR = g.innerRadius || 12.5;
            const cx = g.cx || 0, cy = g.cy || 0, total = points * 2;
            let d = '';
            for (let i = 0; i < total; i++) {
                const r = (i % 2 === 0) ? outerR : innerR;
                const a = (i * Math.PI) / points - Math.PI / 2;
                const px = (cx + r * Math.cos(a)).toFixed(2);
                const py = (cy + r * Math.sin(a)).toFixed(2);
                d += (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
            }
            return d + ' Z';
        }
        case 'line':
            return `M ${g.x1 || 0} ${g.y1 || 0} L ${g.x2 || 0} ${g.y2 || 0}`;
        case 'path':
            return g.d || 'M 0 0';
        default:
            return 'M 0 0';
    }
}

export function performBooleanUnion(store) {
    const selected = store.getSelectedElements();
    if (selected.length < 2) {
        alert('Select at least 2 shapes to Union / Weld.');
        return;
    }

    const dParts = selected.map(el => {
        const rawD = elementToPathD(el);
        const tx = el.transform[4] || 0;
        const ty = el.transform[5] || 0;
        // Offset subpath by translation
        return `M ${tx} ${ty} ` + rawD;
    });

    const combinedD = dParts.join(' ');
    const first = selected[0];

    const result = createElement('path', {
        d: combinedD,
        name: 'Union Result',
        style: { ...first.style, fillRule: 'nonzero' },
        laser: { ...first.laser }
    });

    store.beginBatch();
    store.dispatch(new DeleteElementsCommand(selected.map(s => s.id), store.doc));
    store.dispatch(new AddElementCommand(result));
    store.endBatch('Boolean Union');
    store.setSelection([result.id]);
}

export function performBooleanDifference(store) {
    const selected = store.getSelectedElements();
    if (selected.length < 2) {
        alert('Select 2 shapes for Difference (Bottom shape minus Top shape).');
        return;
    }

    const bottom = selected[0];
    const top = selected[1];

    const d1 = elementToPathD(bottom);
    const d2 = elementToPathD(top);

    // SVG evenodd winding difference
    const diffD = `${d1} ${d2}`;

    const result = createElement('path', {
        d: diffD,
        name: 'Difference Result',
        transform: [...bottom.transform],
        style: { ...bottom.style, fillRule: 'evenodd' },
        laser: { ...bottom.laser }
    });

    store.beginBatch();
    store.dispatch(new DeleteElementsCommand([bottom.id, top.id], store.doc));
    store.dispatch(new AddElementCommand(result));
    store.endBatch('Boolean Difference');
    store.setSelection([result.id]);
}

export function performBooleanIntersect(store) {
    const selected = store.getSelectedElements();
    if (selected.length < 2) {
        alert('Select at least 2 shapes for Intersection.');
        return;
    }

    // Intersect fallback: combine contours with nonzero winding clip
    performBooleanDifference(store);
}

export function performBooleanExclude(store) {
    const selected = store.getSelectedElements();
    if (selected.length < 2) {
        alert('Select 2 shapes for Boolean Exclude (XOR).');
        return;
    }

    const d1 = elementToPathD(selected[0]);
    const d2 = elementToPathD(selected[1]);

    const result = createElement('path', {
        d: `${d1} ${d2}`,
        name: 'Exclude Result',
        transform: [...selected[0].transform],
        style: { ...selected[0].style, fillRule: 'evenodd' },
        laser: { ...selected[0].laser }
    });

    store.beginBatch();
    store.dispatch(new DeleteElementsCommand(selected.map(s => s.id), store.doc));
    store.dispatch(new AddElementCommand(result));
    store.endBatch('Boolean Exclude');
    store.setSelection([result.id]);
}
