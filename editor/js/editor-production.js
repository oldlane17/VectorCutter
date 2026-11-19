/**
 * VectorCutter - SVG Editor Production Tools
 * Module: editor-production.js
 * Description: Laser Color Presets, Material Kerf Presets, Perforation Dashed Lines, 
 *              Sheet Nesting, Layered Stack, Flatten Transforms & Attach Anchors
 */

(function() {
    const MATERIAL_PRESETS = [
        { name: '3.0 mm Plywood', thickness: 3.0, kerf: 0.15, defaultCutPower: '100%', defaultCutSpeed: '15 mm/s' },
        { name: '5.0 mm Plywood', thickness: 5.0, kerf: 0.18, defaultCutPower: '100%', defaultCutSpeed: '8 mm/s' },
        { name: '3.0 mm Cast Acrylic', thickness: 3.0, kerf: 0.12, defaultCutPower: '90%', defaultCutSpeed: '12 mm/s' },
        { name: '5.0 mm Cast Acrylic', thickness: 5.0, kerf: 0.15, defaultCutPower: '100%', defaultCutSpeed: '6 mm/s' },
        { name: '1.5 mm Leather', thickness: 1.5, kerf: 0.10, defaultCutPower: '60%', defaultCutSpeed: '25 mm/s' },
        { name: '1.0 mm Cardboard', thickness: 1.0, kerf: 0.08, defaultCutPower: '40%', defaultCutSpeed: '40 mm/s' },
        { name: 'Paper / Cardstock', thickness: 0.3, kerf: 0.05, defaultCutPower: '25%', defaultCutSpeed: '60 mm/s' }
    ];

    Object.assign(SVGEditor.prototype, {
        initProductionTools() {
            this.materialPresets = MATERIAL_PRESETS;
            this.currentMaterial = JSON.parse(localStorage.getItem('vc_current_material') || JSON.stringify(MATERIAL_PRESETS[0]));
        },

        // --- 1. LASER COLOR SWATCHES (Cut, Score, Engrave) ---
        applyLaserPreset(mode = 'cut') {
            if (!this.selectedElements || this.selectedElements.length === 0) return;

            this.selectedElements.forEach(el => {
                if (mode === 'cut') {
                    // Vector Cut: Red line, no fill, hairline stroke
                    el.setAttribute('stroke', '#FF0000');
                    el.setAttribute('stroke-width', '0.1');
                    el.setAttribute('fill', 'none');
                    el.removeAttribute('stroke-dasharray');
                    el.setAttribute('data-laser-mode', 'cut');
                } else if (mode === 'score') {
                    // Vector Score: Blue line, no fill
                    el.setAttribute('stroke', '#0000FF');
                    el.setAttribute('stroke-width', '0.1');
                    el.setAttribute('fill', 'none');
                    el.removeAttribute('stroke-dasharray');
                    el.setAttribute('data-laser-mode', 'score');
                } else if (mode === 'engrave') {
                    // Raster Engrave: Black fill, no stroke
                    el.setAttribute('fill', '#000000');
                    el.setAttribute('stroke', 'none');
                    el.setAttribute('data-laser-mode', 'engrave');
                }
            });

            this.updateSelectionHandles();
            this.updateContextMenu();
            this.saveState();
        },

        // --- 2. PERFORATION / DASHED LINES ---
        applyDashedLine(dashMm = 4, gapMm = 2) {
            if (!this.selectedElements || this.selectedElements.length === 0) {
                const dashStr = prompt('Dash length in mm:', '4');
                if (!dashStr) return;
                dashMm = parseFloat(dashStr) || 4;

                const gapStr = prompt('Gap length in mm:', '2');
                gapMm = parseFloat(gapStr) || 2;
            }

            const factor = this.unitFactors[this.currentUnits] || 3.7795;
            const dashSVG = (dashMm * factor).toFixed(2);
            const gapSVG = (gapMm * factor).toFixed(2);

            this.selectedElements.forEach(el => {
                el.setAttribute('stroke-dasharray', `${dashSVG},${gapSVG}`);
            });

            this.updateSelectionHandles();
            this.saveState();
        },

        // --- 3. SHEET NESTING (Shelf Packing) ---
        nestElementsOnSheet(sheetWidthMm = 300, sheetHeightMm = 200, marginMm = 3) {
            const userElements = this.getUserElements();
            if (userElements.length === 0) {
                alert('No elements to arrange.');
                return;
            }

            const wStr = prompt('Sheet Width (mm):', '300');
            if (!wStr) return;
            sheetWidthMm = parseFloat(wStr) || 300;

            const hStr = prompt('Sheet Height (mm):', '200');
            if (!hStr) return;
            sheetHeightMm = parseFloat(hStr) || 200;

            const factor = this.unitFactors[this.currentUnits] || 3.7795;
            const sheetW = sheetWidthMm * factor;
            const sheetH = sheetHeightMm * factor;
            const margin = marginMm * factor;

            // Sort elements by height descending for shelf packing
            const items = userElements.map(el => {
                const bbox = el.getBBox();
                return { el, w: bbox.width, h: bbox.height };
            });

            items.sort((a, b) => b.h - a.h);

            let currentX = margin;
            let currentY = margin;
            let currentShelfH = 0;

            items.forEach(item => {
                if (currentX + item.w + margin > sheetW) {
                    // New row
                    currentX = margin;
                    currentY += currentShelfH + margin;
                    currentShelfH = item.h;
                } else {
                    currentShelfH = Math.max(currentShelfH, item.h);
                }

                const bbox = item.el.getBBox();
                const dx = currentX - bbox.x;
                const dy = currentY - bbox.y;
                this.moveElement(item.el, dx, dy);

                currentX += item.w + margin;
            });

            this.updateSelectionHandles();
            this.zoomToFitAll();
            this.saveState();
        },

        // --- 4. LAYERED STACK (Split design into layers for multi-layer 3D builds) ---
        createLayeredStack(layersCount = 3, spacingMm = 10) {
            if (!this.selectedElements || this.selectedElements.length === 0) {
                alert('Select elements to split into a layered stack.');
                return;
            }

            const layersStr = prompt('Number of stacked layers (e.g. 3 or 4 layers of wood):', '3');
            if (!layersStr) return;
            layersCount = parseInt(layersStr, 10);
            if (isNaN(layersCount) || layersCount < 2) return;

            const factor = this.unitFactors[this.currentUnits] || 3.7795;
            const bbox = this.getGroupBoundingBox();
            if (!bbox) return;

            const shiftX = (bbox.width + spacingMm * factor);
            const originalElements = [...this.selectedElements];

            for (let i = 1; i < layersCount; i++) {
                const ns = "http://www.w3.org/2000/svg";
                const layerGroup = document.createElementNS(ns, 'g');
                layerGroup.setAttribute('id', `Layer_${i + 1}`);
                layerGroup.setAttribute('data-layer-index', i + 1);

                originalElements.forEach(el => {
                    const clone = el.cloneNode(true);
                    clone.style.outline = 'none';
                    this.moveElement(clone, shiftX * i, 0);
                    layerGroup.appendChild(clone);
                });

                this.canvas.appendChild(layerGroup);
            }

            this.zoomToFitAll();
            this.saveState();
        },

        // --- 5. FLATTEN (Collapse groups and transforms into plain paths) ---
        flattenSelectedToPlainPaths() {
            if (!this.selectedElements || this.selectedElements.length === 0) return;

            this.selectedElements.forEach(el => {
                if (el.tagName.toLowerCase() === 'g') {
                    // Ungroup and flatten
                    const children = Array.from(el.children);
                    children.forEach(child => {
                        el.parentNode.insertBefore(child, el);
                    });
                    el.remove();
                } else {
                    // Convert to basic path
                    this.elementToPath(el);
                }
            });

            this.clearSelection();
            this.updateSelectionHandles();
            this.saveState();
        },

        // --- 6. ATTACH (Beta - attach element to another's anchor point) ---
        attachToAnchor(anchor = 'right') {
            if (!this.selectedElements || this.selectedElements.length < 2) {
                alert('Select 2 elements: the first element will attach to the anchor of the second.');
                return;
            }

            const item = this.selectedElements[0];
            const target = this.selectedElements[1];

            const itemBox = item.getBBox();
            const tgtBox = target.getBBox();

            let targetX = tgtBox.x;
            let targetY = tgtBox.y;

            if (anchor === 'right') {
                targetX = tgtBox.x + tgtBox.width;
                targetY = tgtBox.y + (tgtBox.height - itemBox.height) / 2;
            } else if (anchor === 'left') {
                targetX = tgtBox.x - itemBox.width;
                targetY = tgtBox.y + (tgtBox.height - itemBox.height) / 2;
            } else if (anchor === 'top') {
                targetX = tgtBox.x + (tgtBox.width - itemBox.width) / 2;
                targetY = tgtBox.y - itemBox.height;
            } else if (anchor === 'bottom') {
                targetX = tgtBox.x + (tgtBox.width - itemBox.width) / 2;
                targetY = tgtBox.y + tgtBox.height;
            }

            const dx = targetX - itemBox.x;
            const dy = targetY - itemBox.y;
            this.moveElement(item, dx, dy);

            this.updateSelectionHandles();
            this.saveState();
        }
    });
})();
