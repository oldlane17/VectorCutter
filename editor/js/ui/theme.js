/**
 * VectorCutter - Theme Controller (Light / Dark / System)
 */

import { storage } from '../core/storage.js';
import { events } from '../core/events.js';

export class ThemeController {
    constructor() {
        this.theme = storage.getItem('vc_theme', 'dark');
        this.applyTheme(this.theme, false);
        this.bindEvents();
    }

    applyTheme(theme, persist = true) {
        this.theme = theme;
        if (theme === 'system') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        const icon = document.getElementById('themeToggleIcon');
        if (icon) {
            icon.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? '☀️' : '🌙';
        }

        if (persist) storage.setItem('vc_theme', theme);
        events.emit('theme:changed', this.theme);
    }

    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        this.applyTheme(next, true);
    }

    bindEvents() {
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.addEventListener('click', () => this.toggle());
        }

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (this.theme === 'system') this.applyTheme('system', false);
            });
        }
    }
}
