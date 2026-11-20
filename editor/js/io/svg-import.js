/**
 * VectorCutter - Native SVG Importer
 * Recursively parses SVG markup into native model elements.
 * Restores smart generator params and 3D settings (§3, §4, §7.9).
 */

import { createElement } from '../model/elements.js';
import { translationMatrix } from '../model/matrix.js';
import { AddElementCommand } from '../core/commands.js';
import { requestRender } from '../core/scheduler.js';

export function importSVGString(svgText, store, mode = 'append') {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');

        const errorNode = doc.querySelector('parsererror');
        if (errorNode) throw new Error('Invalid SVG syntax');

        const svgEl = doc.documentElement;
        if (svgEl.tagName.toLowerCase() !== 'svg') throw new Error('Root element must be <svg>');

        if (mode === 'replace') {
            store.replaceDocument({
                version: 1,
                units: 'mm',
                settings: { ...store.doc.settings },
                components: {},
                elements: {},
                order: [],
                selection: []
            });
        }

        const newElements = [];
        walkNode(svgEl, newElements, [1, 0, 0, 1, 0, 0]);

        if (newElements.length > 0) {
            store.beginBatch();
            newElements.forEach(el => store.dispatch(new AddElementCommand(el)));
            store.endBatch('Import SVG');
            store.setSelection(newElements.map(el => el.id));
        }

        requestRender();
        return { count: newElements.length };
    } catch (e) {
        console.error('[SVG Import] Failed to parse SVG:', e);
        return { count: 0, error: e.message };
    }
}

function walkNode(node, list, currentTransform) {
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();

    // Ignore defs, metadata, scripts
    if (['defs', 'metadata', 'style', 'script', 'clippath', 'mask'].includes(tag)) return;

    // Presentation attributes
    const fill = node.getAttribute('fill') || 'none';
    const stroke = node.getAttribute('stroke') || '#000000';
    const strokeWidth = parseFloat(node.getAttribute('stroke-width')) || 0.5;

    // Laser operation auto-classification
    let laserOp = 'cut';
    if ((!fill || fill === 'none') && stroke !== 'none') {
        const sLower = stroke.toLowerCase();
        laserOp = (sLower === '#0000ff' || sLower === 'blue') ? 'score' : 'cut';
    } else if (fill && fill !== 'none') {
        laserOp = 'engrave';
    }

    const style = { fill, stroke, strokeWidth };
    const laser = { op: laserOp };

    let el = null;
    switch (tag) {
        case 'rect':
            el = createElement('rect', {
                x: parseFloat(node.getAttribute('x')) || 0,
                y: parseFloat(node.getAttribute('y')) || 0,
                width: parseFloat(node.getAttribute('width')) || 10,
                height: parseFloat(node.getAttribute('height')) || 10,
                rx: parseFloat(node.getAttribute('rx')) || 0,
                ry: parseFloat(node.getAttribute('ry')) || 0,
                style, laser, transform: currentTransform
            });
            break;
        case 'circle':
            el = createElement('circle', {
                cx: parseFloat(node.getAttribute('cx')) || 0,
                cy: parseFloat(node.getAttribute('cy')) || 0,
                r: parseFloat(node.getAttribute('r')) || 5,
                style, laser, transform: currentTransform
            });
            break;
        case 'ellipse':
            el = createElement('ellipse', {
                cx: parseFloat(node.getAttribute('cx')) || 0,
                cy: parseFloat(node.getAttribute('cy')) || 0,
                rx: parseFloat(node.getAttribute('rx')) || 10,
                ry: parseFloat(node.getAttribute('ry')) || 5,
                style, laser, transform: currentTransform
            });
            break;
        case 'line':
            el = createElement('line', {
                x1: parseFloat(node.getAttribute('x1')) || 0,
                y1: parseFloat(node.getAttribute('y1')) || 0,
                x2: parseFloat(node.getAttribute('x2')) || 10,
                y2: parseFloat(node.getAttribute('y2')) || 0,
                style, laser, transform: currentTransform
            });
            break;
        case 'polyline':
        case 'polygon': {
            const pts = (node.getAttribute('points') || '').trim().split(/[\s,]+/);
            if (pts.length >= 2) {
                let d = `M ${pts[0]} ${pts[1]}`;
                for (let i = 2; i < pts.length; i += 2) {
                    if (pts[i] !== undefined && pts[i + 1] !== undefined) {
                        d += ` L ${pts[i]} ${pts[i + 1]}`;
                    }
                }
                if (tag === 'polygon') d += ' Z';
                el = createElement('path', { d, style, laser, transform: currentTransform });
            }
            break;
        }
        case 'path':
            el = createElement('path', {
                d: node.getAttribute('d') || 'M 0 0',
                style, laser, transform: currentTransform
            });
            break;
        case 'text':
            el = createElement('text', {
                x: parseFloat(node.getAttribute('x')) || 0,
                y: parseFloat(node.getAttribute('y')) || 0,
                text: node.textContent.trim(),
                fontSize: parseFloat(node.getAttribute('font-size')) || 14,
                fontFamily: node.getAttribute('font-family') || 'Arial',
                style, laser, transform: currentTransform
            });
            break;
        case 'g':
        case 'svg':
            Array.from(node.children).forEach(child => walkNode(child, list, currentTransform));
            break;
    }

    if (el) {
        if (node.id) el.id = node.id;
        const nameAttr = node.getAttribute('data-vc-name');
        if (nameAttr) {
            try { el.name = decodeURIComponent(nameAttr); } catch (e) {}
        }

        const paramsAttr = node.getAttribute('data-vc-params');
        if (paramsAttr) {
            try {
                el.params = JSON.parse(decodeURIComponent(paramsAttr));
                if (el.params.points) el.type = 'star';
                else if (el.params.sides) el.type = 'polygon';
            } catch (e) {}
        }

        const threeDAttr = node.getAttribute('data-vc-3d');
        if (threeDAttr) {
            try {
                el.threeD = JSON.parse(decodeURIComponent(threeDAttr));
            } catch (e) {}
        }

        list.push(el);
    }
}
