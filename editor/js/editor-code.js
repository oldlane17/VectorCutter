/**
 * VectorCutter - SVG Editor Module
 * Module: editor-code.js
 * Description: Live SVG Code Inspection, Code Modal & Two-Way Code Editing
 */

Object.assign(SVGEditor.prototype, {
    async showCode() {
        // Must await here too
        const code = await this.getCleanSVG();
        document.getElementById('svgCode').value = code;
        document.getElementById('codeModal').style.display = 'flex';
    },

    toggleCodeEditor() {
        const editBtn = document.getElementById('editCodeBtn');
        const propertiesPanel = document.getElementById('propertiesPanel');
        const codeEditorPanel = document.getElementById('codeEditorPanel');
        const textarea = document.getElementById('liveSvgCode');

        this.isCodeEditing = !this.isCodeEditing;

        if (this.isCodeEditing) {
            // Switch to code view
            editBtn.classList.add('active');
            propertiesPanel.style.display = 'none';
            codeEditorPanel.style.display = 'flex';
            
            // 1. Get RAW source elements directly from canvas (not the export version)
            const userElements = this.getUserElements();
            
            // 2. Serialize them to a string
            const rawSource = userElements.map(el => {
                // Clone to ensure we don't modify the live canvas yet
                const clone = el.cloneNode(true);
                
                // Clean up temporary UI styles (outline, cursor)
                // This prevents internal editor states from appearing in the code
                clone.style.outline = '';
                clone.style.cursor = '';
                
                // Clean up temporary data attributes if present
                if (clone.hasAttribute('data-original-fill')) clone.removeAttribute('data-original-fill');
                if (clone.hasAttribute('data-original-stroke')) clone.removeAttribute('data-original-stroke');

                return clone.outerHTML;
            }).join('\n');
            
            // 3. Format nicely for readability
            const formatted = rawSource
                .replace(/>/g, '>\n')      // Newline after closing tag
                .replace(/</g, '\n<')      // Newline before opening tag
                .replace(/\n\n/g, '\n')    // Remove empty lines
                .trim();
                
            textarea.value = formatted;
        } else {
            // Switch back to properties view
            editBtn.classList.remove('active');
            codeEditorPanel.style.display = 'none';
            propertiesPanel.style.display = 'flex';
            
            // Refresh properties view
            this.updateContextMenu();
        }
    },

    applyCodeToCanvas() {
        const textarea = document.getElementById('liveSvgCode');
        const rawCode = textarea.value;
        
        try {
            // Create a temporary container to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = `<svg>${rawCode}</svg>`;
            const newElements = Array.from(tempDiv.querySelector('svg').children);
            
            // Validate basic structure
            if (newElements.length === 0 && rawCode.trim().length > 0) {
                throw new Error("No valid SVG elements found.");
            }

            // Clear existing user elements
            const userElements = this.getUserElements();
            userElements.forEach(el => el.remove());
            
            // Append new elements to canvas (before selection group)
            // We need to insert them before the selection group to keep selection on top
            newElements.forEach(el => {
                // Clone to ensure we own the node
                const clone = el.cloneNode(true);
                this.canvas.insertBefore(clone, this.selectionGroup);
            });
            
            // Clear selection as references are lost
            this.clearSelection();
            
            // Flash success or something subtle
            const applyBtn = document.getElementById('applyCodeBtn');
            const originalText = applyBtn.textContent;
            applyBtn.textContent = "Applied!";
            applyBtn.style.background = "#28a745";
            setTimeout(() => {
                applyBtn.textContent = originalText;
                applyBtn.style.background = "#007acc";
            }, 1000);
            
            // Update lists
            this.updateContextMenu();

        } catch (e) {
            alert("Error parsing SVG code: " + e.message);
        }
    }

});
