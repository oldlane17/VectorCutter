/**
 * VectorCutter - SVG Editor Repeat & Pattern Tools
 * Module: editor-patterns.js
 * Description: Linear Repeat, Rotational Repeat, Mirror Repeat & Grid/Tile Repeat
 */

Object.assign(SVGEditor.prototype, {
    // --- 1. LINEAR REPEAT ---
    linearRepeat(count = 4, dxMm = 15, dyMm = 0) {
        if (!this.selectedElements || this.selectedElements.length === 0) {
            const countStr = prompt('Linear Repeat - Number of copies:', '4');
            if (!countStr) return;
            count = parseInt(countStr, 10);

            const dxStr = prompt('Distance X between copies (mm):', '15');
            dxMm = parseFloat(dxStr) || 0;

            const dyStr = prompt('Distance Y between copies (mm):', '0');
            dyMm = parseFloat(dyStr) || 0;
        }

        if (isNaN(count) || count < 2) return;

        const factor = this.unitFactors[this.currentUnits] || 3.7795;
        const dx = dxMm * factor;
        const dy = dyMm * factor;

        const originalElements = [...this.selectedElements];
        const allNewElements = [];

        for (let i = 1; i < count; i++) {
            originalElements.forEach(el => {
                const clone = el.cloneNode(true);
                clone.style.outline = 'none';
                if (clone.id) clone.id = `${clone.id}_lin_${i}`;
                el.parentNode.appendChild(clone);
                this.moveElement(clone, dx * i, dy * i);
                allNewElements.push(clone);
            });
        }

        this.clearSelection();
        this.selectedElements = [...originalElements, ...allNewElements];
        this.selectedElements.forEach(el => el.style.outline = '2px dashed #007acc');
        this.selectedElement = this.selectedElements[0];

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- 2. ROTATIONAL (CIRCULAR) REPEAT ---
    rotationalRepeat(count = 8) {
        if (!this.selectedElements || this.selectedElements.length === 0) {
            alert('Select elements to repeat in a circle.');
            return;
        }

        const countStr = prompt('Rotational Repeat - Number of radial copies around center:', '8');
        if (!countStr) return;
        count = parseInt(countStr, 10);
        if (isNaN(count) || count < 2) return;

        const bbox = this.getGroupBoundingBox();
        if (!bbox) return;

        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        const angleStep = 360 / count;

        const originalElements = [...this.selectedElements];
        const allNewElements = [];

        for (let i = 1; i < count; i++) {
            const angle = angleStep * i;
            originalElements.forEach(el => {
                const clone = el.cloneNode(true);
                clone.style.outline = 'none';
                if (clone.id) clone.id = `${clone.id}_rot_${i}`;
                el.parentNode.appendChild(clone);

                // Rotate clone around group center
                const t = clone.getAttribute('transform') || '';
                clone.setAttribute('transform', `rotate(${angle.toFixed(2)}, ${cx.toFixed(2)}, ${cy.toFixed(2)}) ${t}`);
                allNewElements.push(clone);
            });
        }

        this.clearSelection();
        this.selectedElements = [...originalElements, ...allNewElements];
        this.selectedElements.forEach(el => el.style.outline = '2px dashed #007acc');
        this.selectedElement = this.selectedElements[0];

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- 3. GRID / TILE REPEAT ---
    gridRepeat(rows = 3, cols = 3, gapMm = 5) {
        if (!this.selectedElements || this.selectedElements.length === 0) {
            alert('Select elements to repeat in a grid matrix.');
            return;
        }

        const colsStr = prompt('Columns (X):', '3');
        if (!colsStr) return;
        cols = parseInt(colsStr, 10);

        const rowsStr = prompt('Rows (Y):', '3');
        if (!rowsStr) return;
        rows = parseInt(rowsStr, 10);

        const gapStr = prompt('Gap between items (mm):', '5');
        gapMm = parseFloat(gapStr) || 5;

        if (cols < 1 || rows < 1 || (cols === 1 && rows === 1)) return;

        const factor = this.unitFactors[this.currentUnits] || 3.7795;
        const gap = gapMm * factor;

        const bbox = this.getGroupBoundingBox();
        if (!bbox) return;

        const stepX = bbox.width + gap;
        const stepY = bbox.height + gap;

        const originalElements = [...this.selectedElements];
        const allNewElements = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 && c === 0) continue; // Skip original
                originalElements.forEach(el => {
                    const clone = el.cloneNode(true);
                    clone.style.outline = 'none';
                    if (clone.id) clone.id = `${clone.id}_grid_${r}_${c}`;
                    el.parentNode.appendChild(clone);
                    this.moveElement(clone, stepX * c, stepY * r);
                    allNewElements.push(clone);
                });
            }
        }

        this.clearSelection();
        this.selectedElements = [...originalElements, ...allNewElements];
        this.selectedElements.forEach(el => el.style.outline = '2px dashed #007acc');
        this.selectedElement = this.selectedElements[0];

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    },

    // --- 4. MIRROR REPEAT ---
    mirrorRepeat(direction = 'horizontal') {
        if (!this.selectedElements || this.selectedElements.length === 0) return;

        const bbox = this.getGroupBoundingBox();
        if (!bbox) return;

        const isHoriz = direction === 'horizontal';
        const axis = isHoriz ? (bbox.x + bbox.width) : (bbox.y + bbox.height);

        const clones = [];
        this.selectedElements.forEach(el => {
            const clone = el.cloneNode(true);
            clone.style.outline = 'none';
            if (clone.id) clone.id = `${clone.id}_mirror`;
            el.parentNode.appendChild(clone);
            this.flipElement(clone, direction, axis);
            clones.push(clone);
        });

        this.clearSelection();
        this.selectedElements = clones;
        this.selectedElement = clones[0];
        clones.forEach(c => c.style.outline = '2px dashed #007acc');

        this.updateSelectionHandles();
        this.updateContextMenu();
        this.saveState();
    }
});
