/**
 * VectorCutter - SVG Editor Module
 * Module: editor-elements-tree.js
 * Description: Elements List Tree, Path Splitting & Hierarchy Management
 */

Object.assign(SVGEditor.prototype, {
    updateElementsList(elementsList, elementCount) {
        const userElements = this.getUserElements();
        let totalCount = 0;
        
        elementsList.innerHTML = '';
        
        if (userElements.length === 0) {
            elementsList.innerHTML = '<div class="empty-list"><p>No elements created yet</p></div>';
            if(elementCount) elementCount.textContent = '0 elements';
            return;
        }

        // Recursive render function
        const renderNode = (element, index, depth) => {
            totalCount++;

            const elementItem = document.createElement('div');
            elementItem.className = 'element-item';
            
            // Indentation for children
            if (depth > 0) {
                elementItem.classList.add('is-child');
                elementItem.style.paddingLeft = `${depth * 15 + 10}px`; 
            }

            if (this.selectedElements.includes(element)) {
                elementItem.classList.add('selected');
            }

            // Determine Icon & Folder Status
            let iconKey = element.tagName.toLowerCase();
            const type = element.getAttribute('data-type');
            
            // A "Folder" is a generic group with no special data-type (or explicitly data-type="folder")
            const isFolder = (element.tagName.toLowerCase() === 'g' && (!type || type === 'folder'));
            
            if (type === 'latex') iconKey = 'latex';
            else if (type === 'structure') iconKey = 'structure';
            else if (isFolder) iconKey = 'g'; // Use group/folder icon

            const icon = this.getElementIcon(iconKey);
            
            // Folder Arrow
            let arrow = '';
            if (isFolder) {
                const isExpanded = element.getAttribute('data-expanded') === 'true';
                arrow = isExpanded ? '▼ ' : '▶ ';
            }

            const displayName = this.getElementDisplayName(element, index);

            // --- HTML Structure ---
            elementItem.innerHTML = `
                <div class="element-icon" style="min-width:20px">${arrow}${icon}</div>
                <div class="element-name" style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${displayName}</div>
                
                <div class="element-actions">
                    <!-- Locator Button -->
                    <button class="action-btn locator-btn" title="Locate Element">
                        <img src="sidebar/location.svg" alt="Locate">
                    </button>
                    <!-- Splitter Button -->
                    <button class="action-btn splitter-btn" title="Split / Ungroup">
                        <img src="sidebar/split.svg" alt="Split">
                    </button>
                </div>
            `;

            // --- Events ---
            
            // 1. Select / Toggle Folder
            elementItem.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isFolder && !e.ctrlKey && !e.shiftKey) {
                    // If clicking the arrow or icon area specifically, toggle expand
                    // For simplicity, clicking a selected folder toggles it
                    const isExpanded = element.getAttribute('data-expanded') === 'true';
                    element.setAttribute('data-expanded', !isExpanded);
                    this.updateElementsList(elementsList, elementCount);
                } else {
                    this.handleElementListItemClick(element, e);
                }
            });

            // 2. Locator
            const locBtn = elementItem.querySelector('.locator-btn');
            locBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.zoomToElement(element);
            });

            // 3. Splitter
            const splitBtn = elementItem.querySelector('.splitter-btn');
            splitBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showSplitterMenu(element, e.clientX, e.clientY);
            });

            elementsList.appendChild(elementItem);

            // Render Children if expanded folder
            if (isFolder && element.getAttribute('data-expanded') === 'true') {
                Array.from(element.children).forEach((child, i) => {
                    if(child instanceof SVGGraphicsElement) {
                        renderNode(child, i, depth + 1);
                    }
                });
            }
        };

        // Render Root Level
        userElements.forEach((el, idx) => renderNode(el, idx, 0));

        if(elementCount) elementCount.textContent = `${totalCount} items`;
    },

    updateElementsListHighlight() {
        const elementItems = document.querySelectorAll('.element-item');
        
        // 1. Clear existing highlights
        elementItems.forEach(item => {
            item.classList.remove('selected');
        });
        
        // 2. If we have selected elements
        if (this.selectedElements.length > 0) {
            // Use the exact same getter used to generate the list
            const userElements = this.getUserElements();
            
            this.selectedElements.forEach(selectedElement => {
                const index = userElements.indexOf(selectedElement);
                
                // If found, highlight the corresponding list item
                if (index !== -1 && elementItems[index]) {
                    elementItems[index].classList.add('selected');
                    
                    // Optional: Scroll to the selected item
                    elementItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }
    },

    handleElementListItemClick(element, event) {
        if (event.ctrlKey || event.metaKey) {
            // Multi-selection
            const index = this.selectedElements.indexOf(element);
            if (index > -1) {
                // Remove from selection
                element.style.outline = 'none';
                this.selectedElements.splice(index, 1);
            } else {
                // Add to selection
                element.style.outline = '2px dashed #007acc';
                this.selectedElements.push(element);
            }
        } else {
            // Single selection
            this.clearSelection();
            this.selectedElements = [element];
            element.style.outline = '2px dashed #007acc';
            this.selectedElement = element;
        }
        
        // Update selection handles
        this.updateSelectionHandles();
        // this.updateCoordinateInputs();
        this.updateContextMenu();
    },

    showSplitterMenu(element, x, y) {
        // Clean up old menus
        document.querySelectorAll('.splitter-dropdown').forEach(e => e.remove());

        const menu = document.createElement('div');
        menu.className = 'splitter-dropdown';
        menu.style.left = (x - 140) + 'px'; // Position left of mouse
        menu.style.top = y + 'px';

        // Logic: Is it splittable?
        const tagName = element.tagName.toLowerCase();
        const type = element.getAttribute('data-type');
        const d = element.getAttribute('d');
        
        // A. Split into Paths logic: 
        // Available if it's a Path with multiple moves, OR a Text, OR a Structure/Group containing paths.
        let allowPaths = false;
        if (tagName === 'path' && d) {
            // Simple check: does it have multiple Move commands?
            if ((d.match(/m/gi) || []).length > 1) allowPaths = true;
        } else if (tagName === 'text') {
            allowPaths = true; // (Future: convert text to paths)
        }

        // B. Split into Groups logic:
        // Available if it's a Structure (convert to Folder)
        let allowGroups = (type === 'structure');

        // -- MENU ITEMS --

        // Item 1
        const btnPath = document.createElement('div');
        btnPath.className = `splitter-item ${allowPaths ? '' : 'disabled'}`;
        btnPath.innerHTML = 'Split into Paths';
        btnPath.addEventListener('click', () => {
            if(allowPaths) this.splitToPaths(element);
            menu.remove();
        });

        // Item 2
        const btnGroup = document.createElement('div');
        btnGroup.className = `splitter-item ${allowGroups ? '' : 'disabled'}`;
        btnGroup.innerHTML = 'Split into Groups (Folder)';
        btnGroup.addEventListener('click', () => {
            if(allowGroups) this.splitToGroups(element);
            menu.remove();
        });

        menu.appendChild(btnPath);
        menu.appendChild(btnGroup);
        document.body.appendChild(menu);

        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', function close(e) {
                if(!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', close);
                }
            }, {once:true});
        }, 0);
    }

    // 3. Logic: Split to Paths (Create Folder -> Insert Paths),

    splitToPaths(element) {
        const ns = "http://www.w3.org/2000/svg";
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'path') {
            const d = element.getAttribute('d');
            // Regex to split by M or m, keeping the delimiter
            // This splits "M... L... M..." into ["M... L...", "M..."]
            const rawParts = d.split(/(?=[Mm])/).filter(s => s.trim().length > 0);
            
            if (rawParts.length > 1) {
                // 1. Create the Folder (Group)
                const folder = document.createElementNS(ns, 'g');
                // Remove ID to avoid conflict, copy other attributes
                Array.from(element.attributes).forEach(attr => {
                    if(attr.name !== 'id' && attr.name !== 'd') {
                        folder.setAttribute(attr.name, attr.value);
                    }
                });
                // Tag as folder for UI
                folder.setAttribute('data-type', 'folder'); 
                folder.setAttribute('data-expanded', 'true');

                // 2. Create child paths inside the folder
                rawParts.forEach((partD, i) => {
                    const subPath = document.createElementNS(ns, 'path');
                    subPath.setAttribute('d', partD.trim());
                    // Child paths inherit styles from the parent folder (Group) usually,
                    // but we can set fill/stroke explicitly if needed. 
                    // SVG inheritance handles it if we don't set them on children.
                    folder.appendChild(subPath);
                });

                // 3. Swap in DOM
                element.parentNode.replaceChild(folder, element);
                
                // 4. Update UI
                this.selectElement(folder);
                this.updateElementsList(document.getElementById('elementsList'));
                this.saveState();
            }
        }
    }

    // 4. Logic: Split to Groups (Convert Structure -> Folder),

    splitToGroups(element) {
        // This simply changes the type so it behaves like a transparent folder
        if (element.getAttribute('data-type') === 'structure') {
            // Change type to generic folder
            element.setAttribute('data-type', 'folder');
            element.setAttribute('data-expanded', 'true'); // Auto-open
            
            // Update UI
            this.updateElementsList(document.getElementById('elementsList'));
            this.selectElement(element);
            this.saveState();
        }
    }

    // Updated to handle LaTeX and Structures

});
