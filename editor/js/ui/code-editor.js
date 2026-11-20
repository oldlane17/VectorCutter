/**
 * VectorCutter - Direct SVG Code Editor Component (§3)
 * Two-way live synchronized SVG source code editor with validation, formatting, and sanitization.
 */

import { exportSVGString } from '../io/svg-export.js';
import { importSVGString } from '../io/svg-import.js';
import { requestRender } from '../core/scheduler.js';

export class CodeEditorPanel {
    constructor(containerEl, store) {
        this.container = containerEl;
        this.store = store;
        this.isLiveApply = true;
        this.scope = 'whole'; // 'whole' | 'selection'
        this.debounceTimer = null;
        this.isFocused = false;
        this.lastAppliedCode = '';
    }

    render() {
        if (!this.container) return;

        // Generate SVG markup from current model
        const currentCode = this.generateCode();
        if (!this.isFocused) {
            this.lastAppliedCode = currentCode;
        }

        this.container.innerHTML = `
            <div class="vc-code-panel">
                <div class="vc-code-toolbar">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button class="vc-btn" id="btnCodeApply" title="Apply changes to canvas">Apply</button>
                        <button class="vc-btn" id="btnCodeRevert" title="Revert to canvas state">Revert</button>
                        <button class="vc-btn" id="btnCodeFormat" title="Format XML">Format</button>
                        <button class="vc-btn" id="btnCodeCopy" title="Copy SVG">Copy</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;font-size:11px;">
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                            <input type="checkbox" id="chkCodeLive" ${this.isLiveApply ? 'checked' : ''}> Live apply
                        </label>
                        <select id="selCodeScope" style="background:var(--vc-bg-surface-2);border:1px solid var(--vc-border-default);color:#fff;border-radius:3px;padding:2px 4px;font-size:11px;">
                            <option value="whole" ${this.scope === 'whole' ? 'selected' : ''}>Whole drawing</option>
                            <option value="selection" ${this.scope === 'selection' ? 'selected' : ''}>Selection only</option>
                        </select>
                    </div>
                </div>

                <div id="codeStatus" class="vc-code-status valid">✓ Valid SVG</div>

                <textarea id="svgSourceText" class="vc-code-textarea" spellcheck="false">${this.escapeHTML(this.lastAppliedCode)}</textarea>
            </div>
        `;

        this.bindDomEvents();
    }

    generateCode() {
        if (this.scope === 'selection' && this.store.doc.selection.length > 0) {
            // Subset SVG
            const subsetStore = {
                doc: {
                    ...this.store.doc,
                    order: this.store.doc.order.filter(id => this.store.doc.selection.includes(id))
                }
            };
            return exportSVGString(subsetStore);
        }
        return exportSVGString(this.store);
    }

    bindDomEvents() {
        const textarea = this.container.querySelector('#svgSourceText');
        const statusEl = this.container.querySelector('#codeStatus');
        const applyBtn = this.container.querySelector('#btnCodeApply');
        const revertBtn = this.container.querySelector('#btnCodeRevert');
        const formatBtn = this.container.querySelector('#btnCodeFormat');
        const copyBtn = this.container.querySelector('#btnCodeCopy');
        const liveChk = this.container.querySelector('#chkCodeLive');
        const scopeSel = this.container.querySelector('#selCodeScope');

        if (!textarea) return;

        textarea.addEventListener('focus', () => { this.isFocused = true; });
        textarea.addEventListener('blur', () => { this.isFocused = false; });

        // Tab key inserts 2 spaces
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 2;
                this.onCodeInput();
            }
        });

        textarea.addEventListener('input', () => this.onCodeInput());

        liveChk?.addEventListener('change', (e) => {
            this.isLiveApply = e.target.checked;
        });

        scopeSel?.addEventListener('change', (e) => {
            this.scope = e.target.value;
            this.syncFromModel();
        });

        applyBtn?.addEventListener('click', () => this.applyCode());

        revertBtn?.addEventListener('click', () => {
            this.syncFromModel(true);
        });

        formatBtn?.addEventListener('click', () => {
            try {
                const formatted = this.formatXML(textarea.value);
                textarea.value = formatted;
                if (this.isLiveApply) this.applyCode();
            } catch (err) {}
        });

        copyBtn?.addEventListener('click', () => {
            navigator.clipboard.writeText(textarea.value);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
    }

    onCodeInput() {
        const textarea = this.container.querySelector('#svgSourceText');
        const statusEl = this.container.querySelector('#codeStatus');
        if (!textarea || !statusEl) return;

        const xml = textarea.value;
        const validation = this.validateSVG(xml);

        if (validation.valid) {
            statusEl.className = 'vc-code-status valid';
            statusEl.textContent = '✓ Valid SVG';
            if (this.isLiveApply) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => this.applyCode(), 250);
            }
        } else {
            statusEl.className = 'vc-code-status invalid';
            statusEl.textContent = `✗ Parse Error: ${validation.error}`;
        }
    }

    validateSVG(xml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'image/svg+xml');
            const err = doc.querySelector('parsererror');
            if (err) {
                return { valid: false, error: err.textContent.split('\n')[0] };
            }
            return { valid: true, doc };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    }

    sanitizeSVG(xml) {
        // Strip <script>, event handlers, and javascript:
        return xml
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
            .replace(/\son\w+="[^"]*"/gi, '')
            .replace(/\son\w+='[^']*'/gi, '')
            .replace(/href="javascript:[^"]*"/gi, 'href="#"');
    }

    applyCode() {
        const textarea = this.container.querySelector('#svgSourceText');
        if (!textarea) return;

        const rawXml = textarea.value;
        const val = this.validateSVG(rawXml);
        if (!val.valid) return;

        const sanitized = this.sanitizeSVG(rawXml);
        this.lastAppliedCode = sanitized;

        // Apply to document store
        importSVGString(sanitized, this.store, this.scope === 'selection' ? 'merge' : 'replace');
        requestRender();
    }

    syncFromModel(force = false) {
        const textarea = this.container.querySelector('#svgSourceText');
        if (!textarea) return;
        if (!force && this.isFocused) return;

        const code = this.generateCode();
        this.lastAppliedCode = code;
        textarea.value = code;

        const statusEl = this.container.querySelector('#codeStatus');
        if (statusEl) {
            statusEl.className = 'vc-code-status valid';
            statusEl.textContent = '✓ Valid SVG';
        }
    }

    formatXML(xml) {
        let formatted = '';
        let indent = '';
        const tab = '  ';
        xml.split(/>\s*</).forEach(node => {
            if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
            formatted += indent + '<' + node + '>\r\n';
            if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab;
        });
        return formatted.substring(1, formatted.length - 3);
    }

    escapeHTML(str) {
        return (str || '').replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }
}
