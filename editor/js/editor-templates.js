/**
 * VectorCutter - SVG Editor Module
 * Module: editor-templates.js
 * Description: Parametric Star & N-Gon Shape Generators, SVG Templates Loader
 */

Object.assign(SVGEditor.prototype, {
    setupTemplates() {
        // Bind the sidebar button
        const btn = document.getElementById('templatesBtn');
        if (btn) {
            btn.addEventListener('click', () => this.openTemplatesModal());
        }
    }

    // --- REPLACE THIS METHOD IN SVGEditor CLASS ---,

    openTemplatesModal() {
        const modal = document.getElementById('templatesModal');
        const grid = document.getElementById('templatesGrid');
        
        if (!modal || !grid) return;
        
        // Clear existing content
        grid.innerHTML = '';

        // --- 1. ADD N-GON GENERATOR BUTTON ---
        const ngonCard = document.createElement('div');
        ngonCard.className = 'template-card generator-card';
        ngonCard.innerHTML = `
            <div class="template-preview">
                <svg class="generator-icon" viewBox="0 0 50 50">
                    <polygon points="25,5 45,18 38,42 12,42 5,18" />
                </svg>
            </div>
            <div class="template-name">N-Gon Generator</div>
        `;
        ngonCard.addEventListener('click', () => {
            // Keep modal open, show sub-dialog on top
            this.showNGonDialog(); 
        });
        grid.appendChild(ngonCard);

        // --- 2. ADD STAR GENERATOR BUTTON ---
        const starCard = document.createElement('div');
        starCard.className = 'template-card generator-card';
        starCard.innerHTML = `
            <div class="template-preview">
                <svg class="generator-icon" viewBox="0 0 50 50">
                    <polygon points="25,5 31,18 45,18 34,26 38,40 25,32 12,40 16,26 5,18 19,18" />
                </svg>
            </div>
            <div class="template-name">Star Generator</div>
        `;
        starCard.addEventListener('click', () => {
            this.showStarDialog();
        });
        grid.appendChild(starCard);


        // --- 3. EXISTING FILE TEMPLATES ---
        this.templateFiles.forEach(filename => {
            const displayName = filename
                .replace('.svg', '')
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            const card = document.createElement('div');
            card.className = 'template-card';
            
            const preview = document.createElement('div');
            preview.className = 'template-preview';
            
            const img = document.createElement('img');
            img.src = `templates/${filename}`; 
            img.alt = displayName;
            img.loading = 'lazy';
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'template-name';
            nameLabel.textContent = displayName;
            
            preview.appendChild(img);
            card.appendChild(preview);
            card.appendChild(nameLabel);
            
            card.addEventListener('click', () => {
                this.importTemplate(`templates/${filename}`);
                modal.style.display = 'none';
            });
            
            grid.appendChild(card);
        });
        
        // Show Modal
        modal.style.display = 'flex';
    }


    // --- ADD THESE METHODS TO SVGEditor CLASS ---

    // 1. N-Gon Dialog,

    showNGonDialog() {
        // 1. Get current unit info
        const unitLabel = this.currentUnits; // e.g., 'mm', 'px'
        const factor = this.unitFactors[this.currentUnits]; // e.g., 3.779... for mm

        // 2. Calculate a reasonable default (aiming for ~100px visual size)
        const defaultEdgePx = 100;
        const defaultEdgeVal = (defaultEdgePx / factor).toFixed(2); // Convert px -> unit

        const overlay = document.createElement('div');
        overlay.className = 'scale-modal-overlay';
        overlay.innerHTML = `
            <div class="scale-modal" style="border: 1px solid #4CAF50;">
                <h3 style="color: #81c784;">Generate N-Gon</h3>
                <div class="scale-input-group">
                    <label>Number of Corners (n):</label>
                    <input type="number" id="ngonCorners" value="6" min="3" max="50">
                </div>
                <div class="scale-input-group">
                    <label>Edge Length (${unitLabel}):</label>
                    <input type="number" id="ngonEdgeLen" value="${parseFloat(defaultEdgeVal)}" min="1" step="0.1">
                </div>
                <div class="scale-modal-buttons">
                    <button id="genNgonBtn" style="background: #4CAF50;">Generate</button>
                    <button id="cancelNgonBtn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => document.getElementById('ngonCorners').focus(), 50);

        document.getElementById('genNgonBtn').addEventListener('click', () => {
            const n = parseInt(document.getElementById('ngonCorners').value);
            let edge = parseFloat(document.getElementById('ngonEdgeLen').value);
            
            if(n < 3 || isNaN(edge) || edge <= 0) return alert("Invalid inputs");
            
            // 3. Convert User Unit -> Pixels before generating
            const edgeInPixels = edge * factor;

            this.generateNGon(n, edgeInPixels);
            document.body.removeChild(overlay);
            document.getElementById('templatesModal').style.display = 'none';
        });

        document.getElementById('cancelNgonBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }
    // 2. Star Dialog,

    showStarDialog() {
        // 1. Get current unit info
        const unitLabel = this.currentUnits;
        const factor = this.unitFactors[this.currentUnits];

        // 2. Calculate reasonable defaults (aiming for ~100px outer, ~40px inner)
        const defaultOuterVal = (100 / factor).toFixed(2);
        const defaultInnerVal = (40 / factor).toFixed(2);

        const overlay = document.createElement('div');
        overlay.className = 'scale-modal-overlay';
        overlay.innerHTML = `
            <div class="scale-modal" style="border: 1px solid #4CAF50;">
                <h3 style="color: #81c784;">Generate Star</h3>
                <div class="scale-input-group">
                    <label>Points (n):</label>
                    <input type="number" id="starPoints" value="5" min="3" max="50">
                </div>
                <div class="scale-input-group">
                    <label>Outer Radius (${unitLabel}):</label>
                    <input type="number" id="starOuter" value="${parseFloat(defaultOuterVal)}" min="1" step="0.1">
                </div>
                <div class="scale-input-group">
                    <label>Inner Radius (${unitLabel}):</label>
                    <input type="number" id="starInner" value="${parseFloat(defaultInnerVal)}" min="1" step="0.1">
                </div>
                <div class="scale-modal-buttons">
                    <button id="genStarBtn" style="background: #4CAF50;">Generate</button>
                    <button id="cancelStarBtn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => document.getElementById('starPoints').focus(), 50);

        document.getElementById('genStarBtn').addEventListener('click', () => {
            const n = parseInt(document.getElementById('starPoints').value);
            let outer = parseFloat(document.getElementById('starOuter').value);
            let inner = parseFloat(document.getElementById('starInner').value);
            
            if(n < 3 || isNaN(outer) || isNaN(inner) || outer <= 0 || inner <= 0) return alert("Invalid inputs");
            
            // 3. Convert User Unit -> Pixels before generating
            const outerPx = outer * factor;
            const innerPx = inner * factor;
            
            this.generateStar(n, outerPx, innerPx);
            document.body.removeChild(overlay);
            document.getElementById('templatesModal').style.display = 'none';
        });

        document.getElementById('cancelStarBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }
    // 3. Logic to create N-Gon,

    generateNGon(sides, edgeLength) {
        // edgeLength is now passed in Pixels
        const ns = "http://www.w3.org/2000/svg";
        const radius = edgeLength / (2 * Math.sin(Math.PI / sides));

        let pointsStr = "";
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - (Math.PI / 2);
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            pointsStr += `${x},${y} `;
        }

        const polygon = document.createElementNS(ns, 'polygon');
        polygon.setAttribute('points', pointsStr.trim());
        this.applyProperties(polygon);

        const group = document.createElementNS(ns, 'g');
        group.setAttribute('data-type', 'structure'); // Structure Type
        
        // Position at Center of View
        const cx = this.viewBox.x + this.viewBox.width / 2;
        const cy = this.viewBox.y + this.viewBox.height / 2;
        group.setAttribute('transform', `translate(${cx}, ${cy}) scale(1) rotate(0)`);
        
        group.appendChild(polygon);
        this.canvas.appendChild(group);
        this.selectElement(group);
        this.saveState();
    },

    generateStar(points, rOuter, rInner) {
        // Radii passed in Pixels
        const ns = "http://www.w3.org/2000/svg";
        let pathData = "M ";
        const angleStep = Math.PI / points;
        
        for (let i = 0; i < 2 * points; i++) {
            const r = (i % 2 === 0) ? rOuter : rInner;
            const angle = (i * angleStep) - (Math.PI / 2); 
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            pathData += `${x} ${y} `;
            if(i === 0) pathData += "L ";
        }
        pathData += "Z";

        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', pathData);
        this.applyProperties(path);

        const group = document.createElementNS(ns, 'g');
        group.setAttribute('data-type', 'structure'); // Structure Type

        const cx = this.viewBox.x + this.viewBox.width / 2;
        const cy = this.viewBox.y + this.viewBox.height / 2;
        group.setAttribute('transform', `translate(${cx}, ${cy}) scale(1) rotate(0)`);

        group.appendChild(path);
        this.canvas.appendChild(group);
        this.selectElement(group);
        this.saveState();
    },

    async importTemplate(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const svgText = await response.text();
            
            // Use existing load function in 'append' mode so we don't clear the canvas
            // We pass 'append' as the second argument (forcedMode)
            this.loadSVGContent(svgText, 'append');
            
        } catch (error) {
            console.error("Error loading template:", error);
            alert("Could not load template. Please ensure the file exists in the 'templates' folder.");
        }
    }

});
