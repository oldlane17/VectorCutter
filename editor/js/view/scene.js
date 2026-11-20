/**
 * VectorCutter - Scene Renderer
 * Maps document elements to SVG DOM nodes in world space.
 * Artwork lives inside <g id="world" transform="matrix(...)">.
 * NO selection styles or UI clutter exist inside this tree.
 */

import { matrixToSVGTransform } from '../model/matrix.js';

export class SceneRenderer {
    constructor(worldGroup, store) {
        this.world = worldGroup;
        this.store = store;
        this.nodeMap = new Map(); // id -> SVGElement
    }

    render() {
        const doc = this.store.doc;
        const currentIds = new Set(doc.order);

        // Remove elements no longer in document
        for (const [id, node] of this.nodeMap.entries()) {
            if (!currentIds.has(id)) {
                node.remove();
                this.nodeMap.delete(id);
            }
        }

        // Render / update in correct z-order
        let prevNode = null;
        for (const id of doc.order) {
            const el = doc.elements[id];
            if (!el) continue;

            let node = this.nodeMap.get(id);
            if (!node) {
                node = this.createSVGNode(el);
                this.nodeMap.set(id, node);
            } else {
                this.updateSVGNode(node, el);
            }

            // Maintain z-order
            if (!prevNode) {
                if (this.world.firstChild !== node) {
                    this.world.insertBefore(node, this.world.firstChild);
                }
            } else {
                if (prevNode.nextSibling !== node) {
                    this.world.insertBefore(node, prevNode.nextSibling);
                }
            }
            prevNode = node;
        }
    }

    createSVGNode(el) {
        const ns = "http://www.w3.org/2000/svg";
        let tag = 'path';
        if (el.type === 'rect') tag = 'rect';
        else if (el.type === 'circle') tag = 'circle';
        else if (el.type === 'ellipse') tag = 'ellipse';
        else if (el.type === 'polygon' || el.type === 'star') tag = 'polygon';
        else if (el.type === 'line') tag = 'line';
        else if (el.type === 'text') tag = 'text';
        else if (el.type === 'group') tag = 'g';

        const node = document.createElementNS(ns, tag);
        node.dataset.elementId = el.id;
        this.updateSVGNode(node, el);
        return node;
    }

    updateSVGNode(node, el) {
        const isLaserMode = !!this.store.doc.settings.laserMode;

        if (isLaserMode) {
            const op = el.laser?.op || 'cut';
            if (op === 'cut') {
                node.setAttribute('fill', 'none');
                node.setAttribute('stroke', '#ff3b30');
                node.setAttribute('stroke-width', '0.2');
                node.removeAttribute('stroke-dasharray');
            } else if (op === 'score') {
                node.setAttribute('fill', 'none');
                node.setAttribute('stroke', '#007aff');
                node.setAttribute('stroke-width', '0.2');
                node.removeAttribute('stroke-dasharray');
            } else if (op === 'engrave') {
                node.setAttribute('fill', 'rgba(128, 128, 128, 0.45)');
                node.setAttribute('stroke', 'none');
                node.removeAttribute('stroke-dasharray');
            } else if (op === 'guide') {
                node.setAttribute('fill', 'none');
                node.setAttribute('stroke', '#4caf50');
                node.setAttribute('stroke-width', '0.2');
                node.setAttribute('stroke-dasharray', '2 2');
            }
        } else {
            // Normal presentation styles
            node.setAttribute('fill', el.style?.fill || 'none');
            node.setAttribute('stroke', el.style?.stroke || '#007acc');
            node.setAttribute('stroke-width', el.style?.strokeWidth || '0.5');
            if (el.style?.strokeDasharray) {
                node.setAttribute('stroke-dasharray', el.style.strokeDasharray);
            } else {
                node.removeAttribute('stroke-dasharray');
            }
        }

        node.setAttribute('opacity', el.style?.opacity !== undefined ? el.style.opacity : '1');

        // Transform
        const tStr = matrixToSVGTransform(el.transform);
        if (tStr) {
            node.setAttribute('transform', tStr);
        } else {
            node.removeAttribute('transform');
        }

        // Visibility
        node.style.display = el.visible === false ? 'none' : '';

        // Geometry
        const g = el.geometry || {};
        switch (el.type) {
            case 'rect':
                node.setAttribute('x', g.x || 0);
                node.setAttribute('y', g.y || 0);
                node.setAttribute('width', g.width || 0);
                node.setAttribute('height', g.height || 0);
                if (g.rx) node.setAttribute('rx', g.rx);
                if (g.ry) node.setAttribute('ry', g.ry);
                break;
            case 'circle':
                node.setAttribute('cx', g.cx || 0);
                node.setAttribute('cy', g.cy || 0);
                node.setAttribute('r', g.r || 0);
                break;
            case 'ellipse':
                node.setAttribute('cx', g.cx || 0);
                node.setAttribute('cy', g.cy || 0);
                node.setAttribute('rx', g.rx || 0);
                node.setAttribute('ry', g.ry || 0);
                break;
            case 'polygon': {
                const sides = g.sides || 6;
                const r = g.radius || 25;
                const cx = g.cx || 0;
                const cy = g.cy || 0;
                const pts = [];
                for (let i = 0; i < sides; i++) {
                    const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
                    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
                }
                node.setAttribute('points', pts.join(' '));
                break;
            }
            case 'star': {
                const points = g.points || 5;
                const outerR = g.outerRadius || 25;
                const innerR = g.innerRadius || 12.5;
                const cx = g.cx || 0;
                const cy = g.cy || 0;
                const pts = [];
                const total = points * 2;
                for (let i = 0; i < total; i++) {
                    const r = (i % 2 === 0) ? outerR : innerR;
                    const a = (i * Math.PI) / points - Math.PI / 2;
                    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
                }
                node.setAttribute('points', pts.join(' '));
                break;
            }
            case 'line':
                node.setAttribute('x1', g.x1 || 0);
                node.setAttribute('y1', g.y1 || 0);
                node.setAttribute('x2', g.x2 || 0);
                node.setAttribute('y2', g.y2 || 0);
                break;
            case 'path':
                node.setAttribute('d', g.d || 'M 0 0');
                break;
            case 'text':
                node.setAttribute('x', g.x || 0);
                node.setAttribute('y', g.y || 0);
                node.setAttribute('font-size', g.fontSize || 14);
                node.setAttribute('font-family', g.fontFamily || 'Arial');
                node.textContent = g.text || '';
                break;
        }

        // Laser mode tagging
        if (el.laser?.op) {
            node.setAttribute('data-laser-op', el.laser.op);
        }
    }
}
