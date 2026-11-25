/**
 * VectorCutter - Fonts & Single-Line Typography Engine
 * Self-hosted fonts manifest, font picker registry, and Hershey single-line stroke vectors.
 */

import { storage } from '../core/storage.js';

const SYSTEM_FONTS = new Set([
    'Arial', 'Helvetica', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New', 'sans-serif', 'serif', 'monospace'
]);

export function detectLaTeX(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.trim();
    if (!t) return false;
    // Explicit math delimiters
    if ((t.startsWith('$$') && t.endsWith('$$') && t.length > 4) ||
        (t.startsWith('$') && t.endsWith('$') && t.length > 2) ||
        (t.startsWith('\\(') && t.endsWith('\\)')) ||
        (t.startsWith('\\[') && t.endsWith('\\]'))) {
        return true;
    }
    // Common LaTeX commands or math superscripts/subscripts with braces
    return /\\(?:frac|int|sum|prod|sqrt|lim|sin|cos|tan|log|ln|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|infty|partial|nabla|cdot|times|div|pm|leq|geq|neq|approx|equiv|rightarrow|Rightarrow|left|right|text|mathrm|mathbf|mathbb|vec|hat|bar|overline)\b|[a-zA-Z0-9\)\]}]\s*[\^_]\s*\{/.test(t);
}

export function stripLatexDelimiters(text) {
    let t = (text || '').trim();
    if (t.startsWith('$$') && t.endsWith('$$') && t.length >= 4) t = t.slice(2, -2);
    else if (t.startsWith('$') && t.endsWith('$') && t.length >= 2) t = t.slice(1, -1);
    else if (t.startsWith('\\(') && t.endsWith('\\)')) t = t.slice(2, -2);
    else if (t.startsWith('\\[') && t.endsWith('\\]')) t = t.slice(2, -2);
    return t.trim();
}

class FontManager {
    constructor() {
        this.manifest = [];
        this.loadedFonts = new Set();
        this.categories = ['all', 'sans-serif', 'serif', 'slab', 'script', 'stencil', 'rounded', 'blackletter', 'pixel', 'monospace', 'single-line'];
        this.loadManifest();
    }

    ensureFontLoaded(family) {
        if (!family || SYSTEM_FONTS.has(family) || this.loadedFonts.has(family)) return;
        const entry = this.manifest.find(f => f.family === family);
        if (entry?.singleLine) return;
        this.loadedFonts.add(family);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`;
        document.head.appendChild(link);
    }

    async loadManifest() {
        try {
            const res = await fetch('fonts/fonts.json');
            if (res.ok) {
                const data = await res.json();
                this.manifest = data.fonts || [];
            }
        } catch (err) {
            console.warn('[FontManager] Could not fetch fonts.json, using fallback registry:', err);
            this.manifest = [
                { id: 'roboto', family: 'Roboto', category: 'sans-serif' },
                { id: 'arial', family: 'Arial', category: 'sans-serif' },
                { id: 'dancing-script', family: 'Dancing Script', category: 'script' },
                { id: 'allerta-stencil', family: 'Allerta Stencil', category: 'stencil' },
                { id: 'hershey-simplex', family: 'Hershey Simplex', category: 'single-line', singleLine: true }
            ];
        }
    }

    getFonts(category = 'all', query = '') {
        return this.manifest.filter(f => {
            const matchCat = category === 'all' || f.category === category;
            const matchQuery = !query || f.family.toLowerCase().includes(query.toLowerCase());
            return matchCat && matchQuery;
        });
    }

    /**
     * Render Hershey single-line vector strokes for score / hairline engraving
     */
    renderHersheyText(text, fontSize = 14) {
        // Simple Hershey simplex vector stroke mapping
        let d = '';
        let cursorX = 0;
        const scale = fontSize / 20;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charWidth = 14 * scale;

            if (char === ' ') {
                cursorX += charWidth;
                continue;
            }

            // Generate representative open stroke polyline for scoring
            const x0 = cursorX;
            const y0 = 0;
            const w = charWidth;
            const h = fontSize;

            // Simple stroke skeleton
            d += ` M ${x0.toFixed(1)} ${(y0 - h).toFixed(1)} L ${x0.toFixed(1)} ${y0.toFixed(1)} L ${(x0 + w).toFixed(1)} ${y0.toFixed(1)}`;
            cursorX += charWidth + 2 * scale;
        }

        return d.trim();
    }
}

export const fontManager = new FontManager();
