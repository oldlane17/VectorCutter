/**
 * VectorCutter - SVG Editor Module
 * Module: editor-export.js
 * Description: Clean Laser-Ready SVG Serialization, Text Flattening, PNG Export & Download
 */

Object.assign(SVGEditor.prototype, {
    async getCleanSVGWithActualSize() {
        // 1. Get the precise bounds of all elements
        const bbox = this.getUserElementsBBox(); 
        const userElements = this.getUserElements();
        
        // 2. Set Padding to 0 as requested for tight fit
        const padding = 0; 
        
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, 'svg');
        
        // 3. Setup dimensions
        // Calculate width/height based on current units preference
        let widthStr, heightStr;
        
        // Ensure we don't end up with 0 width/height if canvas is empty
        const finalW = Math.max(1, bbox.width + padding * 2);
        const finalH = Math.max(1, bbox.height + padding * 2);

        if (this.currentUnits !== 'px') {
            const widthInUnits = finalW / this.unitFactors[this.currentUnits];
            const heightInUnits = finalH / this.unitFactors[this.currentUnits];
            widthStr = `${widthInUnits}${this.currentUnits}`;
            heightStr = `${heightInUnits}${this.currentUnits}`;
        } else {
            widthStr = `${finalW}px`;
            heightStr = `${finalH}px`;
        }
        
        svg.setAttribute('width', widthStr);
        svg.setAttribute('height', heightStr);
        
        // 4. Set viewBox to exactly match the bounding box of the elements
        const vx = bbox.x - padding;
        const vy = bbox.y - padding;
        svg.setAttribute('viewBox', `${vx} ${vy} ${finalW} ${finalH}`);
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        // 5. Clone Defs (for fonts/markers if any)
        const canvasDefs = this.canvas.querySelector('defs');
        if (canvasDefs) {
            const defsClone = canvasDefs.cloneNode(true);
            svg.insertBefore(defsClone, svg.firstChild);
        }

        // 6. Clone User Elements directly
        // We do NOT wrap them in a translation group anymore because we adjusted the viewBox to match their position.
        // This keeps the DOM cleaner.
        userElements.forEach(element => {
            const clone = element.cloneNode(true);
            
            // Clean up editor-specific artifacts
            clone.removeAttribute('style'); // Removes selection outline
            clone.removeAttribute('outline');
            if (clone.dataset) {
                delete clone.dataset.originalFill;
                delete clone.dataset.originalStroke;
            }
            
            svg.appendChild(clone);
        });
        
        // 7. Flatten <use> tags and Text (Async operation)
        await this.flattenSVGForExport(svg);

        // 8. Clean up empty defs after flattening
        const oldDefs = svg.querySelectorAll('defs');
        oldDefs.forEach(d => {
            if (d.childNodes.length === 0) d.remove();
        });

        return svg;
    }
    // 2. NEW: Flattens <use> tags (MathJax) into raw <path> tags
    // 2. NEW: Flattens <use> tags AND converts Text to Paths for Laser export
    // 2. UPDATED: Flattens <use> tags AND converts Text to Paths for Laser export
    // 2. UPDATED: Robust Text-to-Path + Deep Color Inheritance Fix,

    async flattenSVGForExport(svgRoot) {
        const ns = "http://www.w3.org/2000/svg";
        
        // Helper: Recursively find the effective fill color by walking up the tree
        // This solves the issue where the color is defined on a parent or grandparent group
        const getInheritedFill = (element) => {
            let current = element;
            while (current && current !== svgRoot) {
                const fill = current.getAttribute('fill');
                if (fill && fill !== 'none' && fill !== 'currentColor') {
                    return fill;
                }
                current = current.parentNode;
            }
            return '#000000'; // Default to black if no color found in ancestry
        };

        // --- PART A: Convert Standard Text to Paths (Vectorization) ---
        const textElements = Array.from(svgRoot.querySelectorAll('text'));
        
        const conversionPromises = textElements.map(async (textEl) => {
            // 1. Extract content and properties
            const content = textEl.textContent || '';
            if (!content.trim()) return; 
            
            const fontFamily = textEl.getAttribute('font-family') || 'Arial';
            const fontSize = parseFloat(textEl.getAttribute('font-size') || 16);
            const x = parseFloat(textEl.getAttribute('x') || 0);
            const y = parseFloat(textEl.getAttribute('y') || 0);
            
            // CRITICAL: Robustly capture the text color
            let fill = textEl.getAttribute('fill');
            if (!fill && textEl.style.fill) fill = textEl.style.fill;
            // If fill is missing or invalid, assume black (standard SVG behavior)
            if (!fill || fill === 'none') fill = '#000000';

            const stroke = textEl.getAttribute('stroke') || 'none';
            const strokeWidth = textEl.getAttribute('stroke-width') || '0';
            const transform = textEl.getAttribute('transform') || '';

            // 2. Map Font Family to MathJax LaTeX commands
            const safeContent = content.replace(/([&%$#_{}])/g, '\\$1');
            let latexCommand = '';

            // Improved mapping for Courier New / Typewriter look
            if (fontFamily.toLowerCase().includes('courier') || fontFamily.toLowerCase().includes('mono')) {
                latexCommand = `\\smash{\\texttt{${safeContent}}}`;
            } else if (fontFamily.toLowerCase().includes('times') || fontFamily.toLowerCase().includes('serif')) {
                latexCommand = `\\smash{\\textrm{${safeContent}}}`;
            } else {
                latexCommand = `\\smash{\\textsf{${safeContent}}}`;
            }

            // 3. Render via MathJax
            try {
                if (!window.MathJax) return;

                const svgContainer = await MathJax.tex2svgPromise(latexCommand);
                const mathSvg = svgContainer.querySelector('svg');
                if (!mathSvg) return;

                const innerG = mathSvg.querySelector('g');
                if (!innerG) return;

                // 4. Create a replacement Group
                const newGroup = document.createElementNS(ns, 'g');
                
                // APPLY THE COLOR TO THIS WRAPPER GROUP
                newGroup.setAttribute('fill', fill);
                
                if (stroke !== 'none') {
                    newGroup.setAttribute('stroke', stroke);
                    newGroup.setAttribute('stroke-width', strokeWidth);
                }

                // 5. Clone the path geometry
                const clone = innerG.cloneNode(true);
                
                // Force inner elements to inherit the group's color
                const innerElements = clone.querySelectorAll('*');
                innerElements.forEach(el => {
                    // Reset local fills so inheritance works
                    el.setAttribute('fill', 'currentColor');
                    el.setAttribute('stroke', 'none');
                });
                
                newGroup.appendChild(clone);

                // 6. Calculate Transform
                const scale = fontSize / 1000; 
                const finalTransform = `translate(${x}, ${y}) ${transform} scale(${scale})`;
                newGroup.setAttribute('transform', finalTransform);
                
                // 7. Handle Defs (Glyph definitions)
                const defs = mathSvg.querySelector('defs');
                if (defs) {
                    let canvasDefs = svgRoot.querySelector('defs');
                    if (!canvasDefs) {
                        canvasDefs = document.createElementNS(ns, 'defs');
                        svgRoot.insertBefore(canvasDefs, svgRoot.firstChild);
                    }
                    Array.from(defs.children).forEach(def => {
                        if (!canvasDefs.querySelector(`#${def.id}`)) {
                            canvasDefs.appendChild(def.cloneNode(true));
                        }
                    });
                }

                // 8. Replace <text> with the new Vector Group
                if(textEl.parentNode) {
                    textEl.parentNode.replaceChild(newGroup, textEl);
                }

            } catch (e) {
                console.error("Error converting text to path:", e);
            }
        });

        await Promise.all(conversionPromises);

        // --- PART B: Flatten <use> tags (Handle LaTeX & MathJax Glyphs) ---
        // This converts the reusable glyphs into raw <path> tags for the laser cutter
        
        const useElements = Array.from(svgRoot.querySelectorAll('use'));
        
        useElements.forEach(useEl => {
            const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
            if (!href) return;
            
            const id = href.replace('#', '');
            const defElement = svgRoot.querySelector(`defs #${id}`);
            
            if (defElement && defElement.tagName === 'path') {
                const newPath = document.createElementNS(ns, 'path');
                newPath.setAttribute('d', defElement.getAttribute('d'));
                
                const useX = parseFloat(useEl.getAttribute('x') || 0);
                const useY = parseFloat(useEl.getAttribute('y') || 0);
                const useTransform = useEl.getAttribute('transform') || '';
                
                let finalTransform = '';
                if (useX !== 0 || useY !== 0) {
                    finalTransform += `translate(${useX}, ${useY}) `;
                }
                finalTransform += useTransform;
                
                if (finalTransform.trim() !== '') {
                    newPath.setAttribute('transform', finalTransform.trim());
                }
                
                // --- COLOR FIX: Walk up the tree to find the correct fill ---
                // 1. Check if the <use> tag has a direct fill
                let effectiveFill = useEl.getAttribute('fill');
                
                // 2. If not, crawl up the DOM until we find a color
                if (!effectiveFill || effectiveFill === 'currentColor' || effectiveFill === 'none') {
                    effectiveFill = getInheritedFill(useEl.parentNode);
                }
                
                // 3. Hardcode that color onto the path
                newPath.setAttribute('fill', effectiveFill);
                
                // Handle stroke similarly if needed, or rely on defaults
                const stroke = useEl.getAttribute('stroke');
                if(stroke && stroke !== 'none') {
                     newPath.setAttribute('stroke', stroke);
                     newPath.setAttribute('stroke-width', useEl.getAttribute('stroke-width') || '1');
                }

                useEl.parentNode.replaceChild(newPath, useEl);
            }
        });
    },

    async getCleanSVG() {
        // We must AWAIT because getCleanSVGWithActualSize is async
        const svgElement = await this.getCleanSVGWithActualSize();
        
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n${svgString}`;
    },

    async saveSVG() {
        // await the clean SVG generation
        const svgElement = await this.getCleanSVGWithActualSize();
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        const svgData = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n${svgString}`;
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ADD/REPLACE THIS METHOD IN YOUR SVGEditor CLASS,

    async exportPNG() {
        // 1. Get the perfect SVG (already cropped, centered, and flattened)
        const svgElement = await this.getCleanSVGWithActualSize();
        
        // 2. Extract the EXACT dimensions from the SVG's viewBox
        // The viewBox format is always "min-x min-y width height"
        // We established in getCleanSVGWithActualSize that min-x/y are 0,0
        const viewBoxAttr = svgElement.getAttribute('viewBox');
        const viewBoxParts = viewBoxAttr.split(' ');
        const vbWidth = parseFloat(viewBoxParts[2]);
        const vbHeight = parseFloat(viewBoxParts[3]);
        
        // 3. Determine the Pixel Scale Factor (DPI)
        // Standard screen DPI is 96. 
        const targetDpi = 96; 
        
        // Calculate pixel dimensions based on the SVG's internal "user units" (which are effectively pixels at 96 DPI)
        // If you are working in mm/cm/in, the internal coordinate system is still unit-agnostic (1 unit = 1/96 inch)
        // so simply taking the viewBox width is correct for 1:1 export.
        
        // If you want higher resolution export later, you can increase this multiplier (e.g., * 2 for double res)
        const scaleFactor = 1; 

        // 4. Calculate final Canvas size
        let widthInPixels = Math.ceil(vbWidth * scaleFactor);
        let heightInPixels = Math.ceil(vbHeight * scaleFactor);
        
        // Safety check
        widthInPixels = Math.max(1, widthInPixels);
        heightInPixels = Math.max(1, heightInPixels);

        // 5. PREPARE THE SVG FOR RENDERING
        // We forcibly set the width/height of the blob SVG to pixels.
        // This overrides any 'mm' or 'cm' units that might confuse the browser's image renderer
        // and guarantees it fits the canvas 1:1.
        svgElement.setAttribute('width', widthInPixels);
        svgElement.setAttribute('height', heightInPixels);
        
        // 6. Serialize
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        // 7. Setup Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = widthInPixels;
        canvas.height = heightInPixels;
        
        // 8. Load and Draw
        const img = new Image();
        // Add header to ensure parsing
        const svgBlob = new Blob([`<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${svgString}`], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
            ctx.clearRect(0, 0, widthInPixels, heightInPixels);
            
            // Draw image at 0,0 stretching to full canvas size (which matches SVG size exactly)
            ctx.drawImage(img, 0, 0, widthInPixels, heightInPixels);
            
            const pngUrl = canvas.toDataURL('image/x-icon');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = 'drawing.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        
        img.onerror = (e) => {
            console.error("Failed to load SVG for PNG export", e);
            alert("Error exporting PNG.");
        };

        img.src = url;
    }

});
