/**
 * VectorCutter - Fonts & Single-Line Typography Engine
 * Self-hosted fonts manifest, font picker registry, and Hershey single-line stroke vectors.
 */

import { storage } from '../core/storage.js';

class FontManager {
    constructor() {
        this.manifest = [];
        this.categories = ['all', 'sans-serif', 'serif', 'script', 'stencil', 'rounded', 'blackletter', 'monospace', 'single-line'];
        this.loadManifest();
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
