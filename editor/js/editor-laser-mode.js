/**
 * VectorCutter - SVG Editor Module
 * Module: editor-laser-mode.js
 * Description: Laser Cutting Preparation, Stroke Redirection & Recursive Style Overrides
 */

Object.assign(SVGEditor.prototype, {
    setupLaserModeToggle() {
        const toggle = document.getElementById('laserModeToggle');
        toggle.addEventListener('click', () => {
            this.laserMode = !this.laserMode;
            toggle.classList.toggle('active', this.laserMode);
            
            // Update all existing elements for laser mode
            this.updateElementsForLaserMode();
            
            // Update context menu immediately
            this.updateContextMenu();
        });
    },

    updatePropertyControlsForLaserMode() {
        const fillColor = document.getElementById('fillColor');
        const strokeColor = document.getElementById('strokeColor');
        const strokeWidth = document.getElementById('strokeWidth');
        
        if (this.laserMode) {
            fillColor.disabled = true;
            strokeColor.disabled = true;
            strokeWidth.disabled = true;
            
            fillColor.value = '#00000000'; // Transparent
            strokeColor.value = '#000000';
            strokeWidth.value = '1';
        } else {
            fillColor.disabled = false;
            strokeColor.disabled = false;
            strokeWidth.disabled = false;
            
            // Restore previous values if available
            if (this.selectedElement && this.selectedElement.dataset.originalFill) {
                fillColor.value = this.selectedElement.dataset.originalFill;
            }
            if (this.selectedElement && this.selectedElement.dataset.originalStroke) {
                strokeColor.value = this.selectedElement.dataset.originalStroke;
            }
        }
    },

    updateElementsForLaserMode() {
        const userElements = this.getUserElements();
        
        userElements.forEach(element => {
            if (this.laserMode) {
                // TURN ON: Recursive set to Transparent/Black/1px
                this.updateElementStyleRecursive(element, 'fill', 'none', true);
                this.updateElementStyleRecursive(element, 'stroke', '#000000', true);
                this.updateElementStyleRecursive(element, 'stroke-width', '1', true);
            } else {
                // TURN OFF: Recursive restore
                this.updateElementStyleRecursive(element, 'fill', null, true); // Value null triggers restore logic
                this.updateElementStyleRecursive(element, 'stroke', null, true);
                this.updateElementStyleRecursive(element, 'stroke-width', null, true);
            }
        });
        
        // Update properties in context menu if something is selected
        if (this.selectedElements.length > 0) {
            this.updateContextMenu();
        }
    }
    // Recursive helper to apply styles to groups and their children,

    updateElementStyleRecursive(element, attribute, value, isLaserToggle = false) {
        // 1. If it's a group (Structure, LaTeX, or Folder), process children
        if (element.tagName.toLowerCase() === 'g') {
            Array.from(element.children).forEach(child => {
                if (child instanceof SVGGraphicsElement) {
                    this.updateElementStyleRecursive(child, attribute, value, isLaserToggle);
                }
            });
            // Also set it on the group itself for good measure (inheritance)
            if (!isLaserToggle) element.setAttribute(attribute, value);
            return;
        }

        // 2. Apply to the actual shape (Path, Rect, Polygon, etc.)
        if (isLaserToggle) {
            // --- Laser Mode Logic ---
            if (this.laserMode) {
                // Store original if not exists
                if (attribute === 'fill' && !element.dataset.originalFill) {
                    element.dataset.originalFill = element.getAttribute('fill') || '#000000';
                }
                if (attribute === 'stroke' && !element.dataset.originalStroke) {
                    element.dataset.originalStroke = element.getAttribute('stroke') || 'none';
                }
                if (attribute === 'stroke-width' && !element.dataset.originalStrokeWidth) {
                    element.dataset.originalStrokeWidth = element.getAttribute('stroke-width') || '1';
                }
                // Apply Value
                element.setAttribute(attribute, value);
            } else {
                // Restore Original
                if (attribute === 'fill' && element.dataset.originalFill) {
                    element.setAttribute('fill', element.dataset.originalFill);
                }
                if (attribute === 'stroke' && element.dataset.originalStroke) {
                    element.setAttribute('stroke', element.dataset.originalStroke);
                }
                if (attribute === 'stroke-width' && element.dataset.originalStrokeWidth) {
                    element.setAttribute('stroke-width', element.dataset.originalStrokeWidth);
                }
            }
        } else {
            // --- Standard Context Menu Edit ---
            element.setAttribute(attribute, value);
            
            // Update the "original" data attributes so Laser Mode toggling works correctly later
            if (attribute === 'fill') element.dataset.originalFill = value;
            if (attribute === 'stroke') element.dataset.originalStroke = value;
            if (attribute === 'stroke-width') element.dataset.originalStrokeWidth = value;
        }
    }

});
