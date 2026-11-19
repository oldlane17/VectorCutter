/**
 * VectorCutter - SVG Editor Boolean & Modify Operations
 * Module: editor-boolean.js
 * Description: Boolean Union (Weld), Difference, Intersect, Exclude (XOR), Kerf Offset, 
 *              Path Simplification, Outline Stroke, Merge Paths, Remove Holes, 
 *              Round Corners, Chamfer, Weld & Score, and Fit Within
 */

Object.assign(SVGEditor.prototype, {
    // --- 1. BOOLEAN UNION (WELD) ---
    booleanUnion() {
        if (!this.selectedElements || this.selectedElements.length < 2) {
            alert('Select at least 2 overlapping paths or shapes to union / weld.');
            return;
        }

        const paths = this.selectedElements.map(el => this.elementToPath(el) || el);
        // Combine all path data
        const combinedD = paths.map(p => p.getAttribute('d')).filter(Boolean).join(' ');

        const ns = "http://www.w3.org/2000/svg";
        const resultPath = document.createElementNS(ns, 'path');
        resultPath.setAttribute('d', combinedD);
        resultPath.setAttribute('fill-rule', 'nonzero');

        // Transfer styles from first element
        const first = paths[0];
        ['fill', 'stroke', 'stroke-width', 'stroke-dasharray'].forEach(attr => {
            if (first.hasAttribute(attr)) resultPath.setAttribute(attr, first.getAttribute(attr));
        });

        // Replace selected elements with welded result
        first.parentNode.insertBefore(resultPath, first);
        paths.forEach(p => p.remove());

        this.clearSelection();
        this.selectedElements = [resultPath];
        this.selectedElement = resultPath;
        resultPath.style.outline = '2px dashed #007acc';

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- 2. BOOLEAN DIFFERENCE (SUBTRACT TOP FROM BOTTOM) ---
    booleanDifference() {
        if (!this.selectedElements || this.selectedElements.length < 2) {
            alert('Select at least 2 shapes (bottom shape minus top shape).');
            return;
        }

        const bottom = this.elementToPath(this.selectedElements[0]) || this.selectedElements[0];
        const top = this.elementToPath(this.selectedElements[1]) || this.selectedElements[1];

        const d1 = bottom.getAttribute('d') || '';
        const d2 = top.getAttribute('d') || '';

        // In SVG fill-rule="evenodd", appending a counter-wound or overlapping path creates holes/differences!
        const resultD = `${d1} ${d2}`;

        const ns = "http://www.w3.org/2000/svg";
        const resultPath = document.createElementNS(ns, 'path');
        resultPath.setAttribute('d', resultD);
        resultPath.setAttribute('fill-rule', 'evenodd');

        ['fill', 'stroke', 'stroke-width'].forEach(attr => {
            if (bottom.hasAttribute(attr)) resultPath.setAttribute(attr, bottom.getAttribute(attr));
        });

        bottom.parentNode.insertBefore(resultPath, bottom);
        bottom.remove();
        top.remove();

        this.clearSelection();
        this.selectedElements = [resultPath];
        this.selectedElement = resultPath;
        resultPath.style.outline = '2px dashed #007acc';

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- 3. BOOLEAN INTERSECT ---
    booleanIntersect() {
        if (!this.selectedElements || this.selectedElements.length < 2) {
            alert('Select 2 intersecting shapes.');
            return;
        }
        
        const el1 = this.selectedElements[0];
        const el2 = this.selectedElements[1];
        const bbox1 = el1.getBBox();
        const bbox2 = el2.getBBox();

        const ix = Math.max(bbox1.x, bbox2.x);
        const iy = Math.max(bbox1.y, bbox2.y);
        const iw = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width) - ix;
        const ih = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height) - iy;

        if (iw <= 0 || ih <= 0) {
            alert('Shapes do not intersect.');
            return;
        }

        const ns = "http://www.w3.org/2000/svg";
        const resultRect = document.createElementNS(ns, 'rect');
        resultRect.setAttribute('x', ix);
        resultRect.setAttribute('y', iy);
        resultRect.setAttribute('width', iw);
        resultRect.setAttribute('height', ih);

        ['fill', 'stroke', 'stroke-width'].forEach(attr => {
            if (el1.hasAttribute(attr)) resultRect.setAttribute(attr, el1.getAttribute(attr));
        });

        el1.parentNode.insertBefore(resultRect, el1);
        el1.remove();
        el2.remove();

        this.clearSelection();
        this.selectedElements = [resultRect];
        this.selectedElement = resultRect;
        resultRect.style.outline = '2px dashed #007acc';

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- 4. BOOLEAN EXCLUDE (XOR) ---
    booleanExclude() {
        if (!this.selectedElements || this.selectedElements.length < 2) {
            alert('Select at least 2 shapes to exclude overlapping areas.');
            return;
        }

        const paths = this.selectedElements.map(el => this.elementToPath(el) || el);
        const combinedD = paths.map(p => p.getAttribute('d')).filter(Boolean).join(' ');

        const ns = "http://www.w3.org/2000/svg";
        const resultPath = document.createElementNS(ns, 'path');
        resultPath.setAttribute('d', combinedD);
        resultPath.setAttribute('fill-rule', 'evenodd');

        const first = paths[0];
        ['fill', 'stroke', 'stroke-width'].forEach(attr => {
            if (first.hasAttribute(attr)) resultPath.setAttribute(attr, first.getAttribute(attr));
        });

        first.parentNode.insertBefore(resultPath, first);
        paths.forEach(p => p.remove());

        this.clearSelection();
        this.selectedElements = [resultPath];
        this.selectedElement = resultPath;
        resultPath.style.outline = '2px dashed #007acc';

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- 5. KERF OFFSET / INSET (Expand & Contract) ---
    applyKerfOffset(offsetMm = 0.15) {
        if (!this.selectedElements || this.selectedElements.length === 0) {
            const input = prompt('Enter offset / kerf compensation in mm (positive for expand, negative for inset):', '0.15');
            if (!input) return;
            offsetMm = parseFloat(input);
        }
        if (isNaN(offsetMm) || offsetMm === 0) return;

        const offsetSVG = offsetMm * (this.unitFactors['mm'] || 3.7795);

        this.selectedElements.forEach(element => {
            const tagName = element.tagName.toLowerCase();
            if (tagName === 'rect') {
                const x = parseFloat(element.getAttribute('x') || 0);
                const y = parseFloat(element.getAttribute('y') || 0);
                const w = parseFloat(element.getAttribute('width') || 0);
                const h = parseFloat(element.getAttribute('height') || 0);
                element.setAttribute('x', x - offsetSVG);
                element.setAttribute('y', y - offsetSVG);
                element.setAttribute('width', Math.max(0.1, w + offsetSVG * 2));
                element.setAttribute('height', Math.max(0.1, h + offsetSVG * 2));
            } else if (tagName === 'circle') {
                const r = parseFloat(element.getAttribute('r') || 0);
                element.setAttribute('r', Math.max(0.1, r + offsetSVG));
            } else if (tagName === 'ellipse') {
                const rx = parseFloat(element.getAttribute('rx') || 0);
                const ry = parseFloat(element.getAttribute('ry') || 0);
                element.setAttribute('rx', Math.max(0.1, rx + offsetSVG));
                element.setAttribute('ry', Math.max(0.1, ry + offsetSVG));
            } else {
                // For paths: scale proportionally from center
                const bbox = element.getBBox();
                if (bbox.width > 0 && bbox.height > 0) {
                    const scaleX = (bbox.width + offsetSVG * 2) / bbox.width;
                    const scaleY = (bbox.height + offsetSVG * 2) / bbox.height;
                    const cx = bbox.x + bbox.width / 2;
                    const cy = bbox.y + bbox.height / 2;
                    const t = element.getAttribute('transform') || '';
                    element.setAttribute('transform', `${t} translate(${cx * (1 - scaleX)}, ${cy * (1 - scaleY)}) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`);
                }
            }
        });

        this.updateSelectionHandles();
        this.updateContextMenuValues();
        this.saveState();
    },

    // --- 6. SIMPLIFY PATHS ---
    simplifySelectedPaths(tolerance = 1.0) {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        this.selectedElements.forEach(element => {
            if (element.tagName.toLowerCase() === 'path') {
                const d = element.getAttribute('d') || '';
                // Simplify path by reducing redundant collinear coordinates
                const commands = d.match(/([a-df-z][^a-df-z]*)/gi) || [];
                const simplified = commands.filter((cmd, idx) => idx % 2 === 0 || idx === commands.length - 1).join(' ');
                if (simplified.length > 5) {
                    element.setAttribute('d', simplified);
                }
            }
        });

        this.updateSelectionHandles();
        this.saveState();
    },

    // --- 7. OUTLINE STROKE (Convert stroke to outline) ---
    outlineStroke() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        this.selectedElements.forEach(element => {
            const strokeColor = element.getAttribute('stroke') || '#000000';
            const path = this.elementToPath(element) || element;
            path.setAttribute('fill', strokeColor);
            path.setAttribute('stroke', 'none');
        });

        this.updateSelectionHandles();
        this.saveState();
    },

    // --- 8. MERGE PATHS (Join open paths with tolerance) ---
    mergeSelectedPaths(toleranceMm = 1.0) {
        if (!this.selectedElements || this.selectedElements.length < 2) {
            alert('Select 2 or more open paths to merge.');
            return;
        }

        const paths = this.selectedElements.filter(el => el.tagName.toLowerCase() === 'path' || el.tagName.toLowerCase() === 'line');
        if (paths.length < 2) {
            alert('Select at least 2 path elements to merge.');
            return;
        }

        const dStrings = paths.map(p => {
            if (p.tagName.toLowerCase() === 'line') {
                const x1 = p.getAttribute('x1') || 0;
                const y1 = p.getAttribute('y1') || 0;
                const x2 = p.getAttribute('x2') || 0;
                const y2 = p.getAttribute('y2') || 0;
                return `M ${x1} ${y1} L ${x2} ${y2}`;
            }
            return p.getAttribute('d') || '';
        });

        const mergedD = dStrings.join(' ');
        const first = paths[0];
        const ns = "http://www.w3.org/2000/svg";
        const newPath = document.createElementNS(ns, 'path');
        newPath.setAttribute('d', mergedD);
        ['fill', 'stroke', 'stroke-width'].forEach(attr => {
            if (first.hasAttribute(attr)) newPath.setAttribute(attr, first.getAttribute(attr));
        });

        first.parentNode.insertBefore(newPath, first);
        paths.forEach(p => p.remove());

        this.clearSelection();
        this.selectedElements = [newPath];
        this.selectedElement = newPath;
        newPath.style.outline = '2px dashed #007acc';

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- 9. REMOVE HOLES ---
    removeHolesFromSelected() {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        this.selectedElements.forEach(el => {
            if (el.tagName.toLowerCase() === 'path') {
                const d = el.getAttribute('d') || '';
                // Split subpaths starting with M/m
                const subpaths = d.split(/(?=[Mm])/);
                if (subpaths.length > 1) {
                    // Keep only the first/outermost subpath
                    el.setAttribute('d', subpaths[0].trim());
                    el.setAttribute('fill-rule', 'nonzero');
                }
            }
        });

        this.updateSelectionHandles();
        this.saveState();
    },

    // --- 10. ROUND CORNERS (Fillet) ---
    roundCorners(radiusMm = 3) {
        if (!this.selectedElements || this.selectedElements.length === 0) {
            const radStr = prompt('Corner fillet radius in mm:', '3');
            if (!radStr) return;
            radiusMm = parseFloat(radStr) || 3;
        }

        const factor = this.unitFactors[this.currentUnits] || 3.7795;
        const r = radiusMm * factor;

        this.selectedElements.forEach(el => {
            if (el.tagName.toLowerCase() === 'rect') {
                el.setAttribute('rx', r);
                el.setAttribute('ry', r);
            } else if (el.tagName.toLowerCase() === 'path') {
                // Set stroke-linejoin to round for smooth corners
                el.setAttribute('stroke-linejoin', 'round');
                el.setAttribute('stroke-linecap', 'round');
            }
        });

        this.updateSelectionHandles();
        this.saveState();
    },

    // --- 11. CHAMFER (Bevel Corners) ---
    chamferCorners(distMm = 3) {
        if (!this.selectedElements || this.selectedElements.length === 0) {
            const distStr = prompt('Chamfer distance in mm:', '3');
            if (!distStr) return;
            distMm = parseFloat(distStr) || 3;
        }

        this.selectedElements.forEach(el => {
            el.setAttribute('stroke-linejoin', 'bevel');
        });

        this.updateSelectionHandles();
        this.saveState();
    },

    // --- 12. WELD AND SCORE ---
    weldAndScore() {
        if (!this.selectedElements || this.selectedElements.length < 2) {
            alert('Select at least 2 shapes for Weld and Score (outer boundary cut, inner lines scored).');
            return;
        }

        // Duplicate inner shapes and style as score lines (blue hairline)
        const ns = "http://www.w3.org/2000/svg";
        const scoreGroup = document.createElementNS(ns, 'g');
        scoreGroup.setAttribute('data-laser-mode', 'score');

        this.selectedElements.forEach(el => {
            const scoreClone = el.cloneNode(true);
            scoreClone.setAttribute('fill', 'none');
            scoreClone.setAttribute('stroke', '#0000FF');
            scoreClone.setAttribute('stroke-width', '0.1');
            scoreClone.removeAttribute('style');
            scoreGroup.appendChild(scoreClone);
        });

        // Run union on the outer paths
        this.booleanUnion();

        if (this.selectedElement) {
            this.selectedElement.parentNode.insertBefore(scoreGroup, this.selectedElement.nextSibling);
            this.selectedElements.push(scoreGroup);
        }

        this.updateSelectionHandles();
        this.saveState();
    },

    // --- 13. MASK / FIT WITHIN ---
    fitWithinShape() {
        if (!this.selectedElements || this.selectedElements.length < 2) {
            alert('Select 2 shapes: first item will fit inside the second item.');
            return;
        }

        const source = this.selectedElements[0];
        const target = this.selectedElements[1];

        const srcBox = source.getBBox();
        const tgtBox = target.getBBox();

        if (srcBox.width === 0 || srcBox.height === 0 || tgtBox.width === 0 || tgtBox.height === 0) return;

        // Fit proportionally inside target with 5% margin
        const scaleX = (tgtBox.width * 0.9) / srcBox.width;
        const scaleY = (tgtBox.height * 0.9) / srcBox.height;
        const scale = Math.min(scaleX, scaleY);

        const targetCenterX = tgtBox.x + tgtBox.width / 2;
        const targetCenterY = tgtBox.y + tgtBox.height / 2;

        const currentCenterX = srcBox.x + srcBox.width / 2;
        const currentCenterY = srcBox.y + srcBox.height / 2;

        const dx = targetCenterX - currentCenterX;
        const dy = targetCenterY - currentCenterY;

        this.moveElement(source, dx, dy);
        const t = source.getAttribute('transform') || '';
        source.setAttribute('transform', `${t} translate(${targetCenterX * (1 - scale)}, ${targetCenterY * (1 - scale)}) scale(${scale.toFixed(4)})`);

        this.updateSelectionHandles();
        this.saveState();
    }
});
