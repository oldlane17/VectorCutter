/**
 * VectorCutter - Scene Renderer
 * Maps document elements to SVG DOM nodes in world space.
 * Pure model reader driven by the centralized render scheduler (§1.3).
 */

import { matrixToSVGTransform } from '../model/matrix.js';
import { generateStarVertices, generatePolygonVertices, verticesToFilletPath } from '../model/generators.js';
import { fontManager, detectLaTeX, stripLatexDelimiters } from '../io/fonts.js';
import { requestRender } from '../core/scheduler.js';

export class SceneRenderer {
    constructor(worldGroup, store) {
        this.world = worldGroup;
        this.store = store;
        this.nodeMap = new Map(); // id -> SVGElement
        this.latexCache = new Map(); // cleanTex -> { innerHtml, vbW, vbH }
        this.latexPending = new Set();
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
            if (!node || node.tagName.toLowerCase() !== this.getExpectedTag(el)) {
                if (node) node.remove();
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

    getExpectedTag(el) {
        if (el.params && el.params.cornerRadius > 0) return 'path';
        if (el.type === 'rect') return 'rect';
        if (el.type === 'circle') return 'circle';
        if (el.type === 'ellipse') return 'ellipse';
        if (el.type === 'polygon' || el.type === 'star') return 'polygon';
        if (el.type === 'line') return 'line';
        if (el.type === 'text') {
            return (el.geometry?.isLaTeX || detectLaTeX(el.geometry?.text)) ? 'g' : 'text';
        }
        if (el.type === 'group') return 'g';
        return 'path';
    }

    createSVGNode(el) {
        const ns = "http://www.w3.org/2000/svg";
        const tag = this.getExpectedTag(el);
        const node = document.createElementNS(ns, tag);
        node.dataset.elementId = el.id;
        this.updateSVGNode(node, el);
        return node;
    }

    updateSVGNode(node, el) {
        // Hidden elements (§2)
        if (el.visible === false) {
            node.style.display = 'none';
            return;
        } else {
            node.style.display = '';
        }

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

        // Geometry rendering
        const g = el.geometry || {};
        const p = el.params || null;

        if (p && p.cornerRadius > 0) {
            let verts = [];
            if (el.type === 'star') verts = generateStarVertices(p);
            else if (el.type === 'polygon') verts = generatePolygonVertices(p);
            const pathD = verticesToFilletPath(verts, p.cornerRadius);
            node.setAttribute('d', pathD);
            return;
        }

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
                const verts = p ? generatePolygonVertices(p) : [];
                if (verts.length > 0) {
                    node.setAttribute('points', verts.map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' '));
                } else {
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
                }
                break;
            }
            case 'star': {
                const verts = p ? generateStarVertices(p) : [];
                if (verts.length > 0) {
                    node.setAttribute('points', verts.map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' '));
                } else {
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
                }
                break;
            }
            case 'line':
                node.setAttribute('x1', g.x1 || 0);
                node.setAttribute('y1', g.y1 || 0);
                node.setAttribute('x2', g.x2 || 0);
                node.setAttribute('y2', g.y2 || 0);
                break;
            case 'text': {
                const isLatex = !!(g.isLaTeX || detectLaTeX(g.text));
                if (isLatex) {
                    const cleanTex = stripLatexDelimiters(g.text || '');
                    if (!cleanTex) {
                        node.innerHTML = '';
                        break;
                    }
                    const cached = this.latexCache.get(cleanTex);
                    if (cached) {
                        const fontSize = g.fontSize || 14;
                        const scale = fontSize / 1000;
                        if (node.dataset.renderedTex !== cleanTex || node.dataset.renderedSize !== String(fontSize)) {
                            node.innerHTML = `<g transform="translate(${g.x || 0}, ${g.y || 0}) scale(${scale})">${cached.innerHtml}</g>`;
                            node.dataset.renderedTex = cleanTex;
                            node.dataset.renderedSize = String(fontSize);
                        }
                        // Compute world-space local bounds from MathJax viewBox units (ex -> ~fontSize)
                        const aspect = cached.vbH > 0 ? (cached.vbW / cached.vbH) : 2;
                        const hMm = fontSize * 1.3;
                        el._latexBounds = { width: Math.max(5, hMm * aspect), height: Math.max(5, hMm) };
                    } else if (!this.latexPending.has(cleanTex)) {
                        this.latexPending.add(cleanTex);
                        this.renderLatexAsync(cleanTex);
                        node.innerHTML = `<text x="${g.x || 0}" y="${g.y || 0}" font-size="${g.fontSize || 14}" font-family="serif">Rendering LaTeX...</text>`;
                    }
                } else {
                    delete el._latexBounds;
                    if (g.fontFamily) fontManager.ensureFontLoaded(g.fontFamily);
                    node.setAttribute('x', g.x || 0);
                    node.setAttribute('y', g.y || 0);
                    node.setAttribute('font-size', g.fontSize || 14);
                    node.setAttribute('font-family', g.fontFamily || 'Arial');
                    node.setAttribute('font-weight', g.fontWeight || 'normal');
                    node.textContent = g.text || '';
                }
                break;
            }
            case 'path':
                node.setAttribute('d', g.d || '');
                break;
            default:
                break;
        }
    }

    async renderLatexAsync(cleanTex) {
        try {
            if (!window.MathJax || !window.MathJax.tex2svgPromise) {
                // Retry once MathJax finishes async load
                setTimeout(() => {
                    this.latexPending.delete(cleanTex);
                    requestRender();
                }, 300);
                return;
            }
            const svgContainer = await window.MathJax.tex2svgPromise(cleanTex);
            const mathSvg = svgContainer?.querySelector('svg');
            const innerG = mathSvg?.querySelector('g');
            if (mathSvg && innerG) {
                const clone = innerG.cloneNode(true);
                clone.setAttribute('fill', 'inherit');
                const vb = (mathSvg.getAttribute('viewBox') || '0 0 1000 1000').split(/\s+/).map(Number);
                this.latexCache.set(cleanTex, {
                    innerHtml: clone.outerHTML,
                    vbW: vb[2] || 1000,
                    vbH: vb[3] || 1000
                });
            }
        } catch (err) {
            console.warn('[SceneRenderer] MathJax render error:', err);
        } finally {
            this.latexPending.delete(cleanTex);
            requestRender();
        }
    }
}
