/**
 * VectorCutter - SVG Editor Advanced Text Tools & Canvas Guides
 * Module: editor-text-tools.js
 * Description: Text Along Path (with offset & flip), Text Within Box (auto-fit/wrap), 
 *              and Draggable Horizontal/Vertical Ruler Line Guides
 */

(function() {
    Object.assign(SVGEditor.prototype, {
        initTextTools() {
            this.guideLines = [];
            this.setupRulerGuideListeners();
        },

        // --- 1. TEXT ALONG PATH ---
        applyTextAlongPath() {
            if (!this.selectedElements || this.selectedElements.length < 2) {
                alert('Select 1 Text element and 1 Path or Line to wrap text along.');
                return;
            }

            const textEl = this.selectedElements.find(el => el.tagName.toLowerCase() === 'text');
            const pathEl = this.selectedElements.find(el => el.tagName.toLowerCase() === 'path' || el.tagName.toLowerCase() === 'line');

            if (!textEl || !pathEl) {
                alert('Selection must include one Text element and one Path/Line.');
                return;
            }

            // LaTeX is explicitly excluded (§2 & §6.5)
            if (textEl.getAttribute('data-text-mode') === 'latex' || textEl.getAttribute('data-type') === 'latex') {
                alert('Text along path is not supported for LaTeX formulas.');
                return;
            }

            // Ensure path has an ID for textPath href
            if (!pathEl.id) {
                pathEl.id = `path_guide_${Date.now()}`;
            }

            const rawText = textEl.textContent.trim();
            const ns = "http://www.w3.org/2000/svg";

            // Create textPath
            const textPath = document.createElementNS(ns, 'textPath');
            textPath.setAttribute('href', `#${pathEl.id}`);
            textPath.setAttribute('startOffset', '0%');
            textPath.textContent = rawText;

            textEl.innerHTML = '';
            textEl.removeAttribute('x');
            textEl.removeAttribute('y');
            textEl.appendChild(textPath);
            textEl.setAttribute('data-text-along-path', pathEl.id);

            this.updateSelectionHandles();
            this.updateContextMenu();
            this.saveState();
        },

        // Reverse / Flip text along path
        flipTextAlongPath() {
            if (!this.selectedElement || this.selectedElement.tagName.toLowerCase() !== 'text') return;
            const textPath = this.selectedElement.querySelector('textPath');
            if (!textPath) return;

            const currentSide = textPath.getAttribute('side') || 'left';
            textPath.setAttribute('side', currentSide === 'left' ? 'right' : 'left');

            this.updateSelectionHandles();
            this.saveState();
        },

        // Set start offset (percentage 0 - 100%)
        setTextPathOffset(offsetPercent = 0) {
            if (!this.selectedElement || this.selectedElement.tagName.toLowerCase() !== 'text') return;
            const textPath = this.selectedElement.querySelector('textPath');
            if (!textPath) return;

            textPath.setAttribute('startOffset', `${offsetPercent}%`);
            this.updateSelectionHandles();
            this.saveState();
        },

        // --- 2. TEXT WITHIN BOX (Auto-fit & wrap) ---
        fitTextWithinBox(maxWidthMm = 100) {
            if (!this.selectedElement || this.selectedElement.tagName.toLowerCase() !== 'text') {
                alert('Select a text element to wrap within a box.');
                return;
            }

            if (this.selectedElement.getAttribute('data-text-mode') === 'latex') {
                alert('Not available for LaTeX.');
                return;
            }

            const wStr = prompt('Maximum box width in mm:', '80');
            if (!wStr) return;
            maxWidthMm = parseFloat(wStr) || 80;

            const factor = this.unitFactors[this.currentUnits] || 3.7795;
            const maxPx = maxWidthMm * factor;

            const text = this.selectedElement.textContent.trim();
            const words = text.split(/\s+/);
            const x = parseFloat(this.selectedElement.getAttribute('x') || 0);
            const y = parseFloat(this.selectedElement.getAttribute('y') || 0);
            const fontSize = parseFloat(this.selectedElement.getAttribute('font-size') || 16);
            const lineHeight = fontSize * 1.25;

            const ns = "http://www.w3.org/2000/svg";
            this.selectedElement.innerHTML = '';

            let currentLine = '';
            let lineIndex = 0;

            // Approximate character width ≈ 0.6 * fontSize
            const charWidth = fontSize * 0.58;
            const maxCharsPerLine = Math.max(5, Math.floor(maxPx / charWidth));

            words.forEach(word => {
                if ((currentLine + ' ' + word).trim().length > maxCharsPerLine && currentLine.length > 0) {
                    const tspan = document.createElementNS(ns, 'tspan');
                    tspan.setAttribute('x', x);
                    tspan.setAttribute('dy', lineIndex === 0 ? 0 : lineHeight);
                    tspan.textContent = currentLine.trim();
                    this.selectedElement.appendChild(tspan);
                    lineIndex++;
                    currentLine = word;
                } else {
                    currentLine += (currentLine ? ' ' : '') + word;
                }
            });

            if (currentLine) {
                const tspan = document.createElementNS(ns, 'tspan');
                tspan.setAttribute('x', x);
                tspan.setAttribute('dy', lineIndex === 0 ? 0 : lineHeight);
                tspan.textContent = currentLine.trim();
                this.selectedElement.appendChild(tspan);
            }

            this.updateSelectionHandles();
            this.saveState();
        },

        // --- 3. DRAGGABLE RULER LINE GUIDES ---
        setupRulerGuideListeners() {
            const hRuler = document.querySelector('.ruler-horizontal');
            const vRuler = document.querySelector('.ruler-vertical');

            if (hRuler) {
                hRuler.style.cursor = 'row-resize';
                hRuler.title = 'Click to place horizontal guide line';
                hRuler.addEventListener('click', (e) => {
                    const pt = this.getSVGCoordinates(e);
                    this.addGuideLine('horizontal', pt.y);
                });
            }

            if (vRuler) {
                vRuler.style.cursor = 'col-resize';
                vRuler.title = 'Click to place vertical guide line';
                vRuler.addEventListener('click', (e) => {
                    const pt = this.getSVGCoordinates(e);
                    this.addGuideLine('vertical', pt.x);
                });
            }
        },

        addGuideLine(orientation = 'horizontal', position = 0) {
            const ns = "http://www.w3.org/2000/svg";
            const guide = document.createElementNS(ns, 'line');
            const guideCount = this.guideLines.length + 1;
            const guideId = `guide_${guideCount}`;

            guide.setAttribute('id', guideId);
            guide.setAttribute('class', 'canvas-guide-line');
            guide.setAttribute('data-guide', orientation);
            guide.setAttribute('data-name', `Line Guide ${guideCount}`);
            guide.setAttribute('stroke', '#00e5ff');
            guide.setAttribute('stroke-width', '0.75');
            guide.setAttribute('stroke-dasharray', '5,5');
            guide.style.cursor = orientation === 'horizontal' ? 'row-resize' : 'col-resize';

            const far = 10000;
            if (orientation === 'horizontal') {
                guide.setAttribute('x1', -far);
                guide.setAttribute('y1', position);
                guide.setAttribute('x2', far);
                guide.setAttribute('y2', position);
            } else {
                guide.setAttribute('x1', position);
                guide.setAttribute('y1', -far);
                guide.setAttribute('x2', position);
                guide.setAttribute('y2', far);
            }

            this.canvas.appendChild(guide);
            this.guideLines.push(guide);

            this.clearSelection();
            this.selectElement(guide);
            this.saveState();
        },

        clearAllGuides() {
            const guides = Array.from(this.canvas.querySelectorAll('.canvas-guide-line'));
            guides.forEach(g => g.remove());
            this.guideLines = [];
            this.clearSelection();
            this.saveState();
        }
    });
})();
