/**
 * VectorCutter - SVG Editor Shape Library & Parametric Shapes
 * Module: editor-shapes-library.js
 * Description: 25+ Shape Presets (Gear, Heart, Arrow, Cross, Speech Bubble, Arc/Pie, Icons) & Library Modal
 */

(function() {
    const SHAPE_PRESETS = [
        // --- SYMBOLS ---
        {
            id: 'heart',
            name: 'Heart',
            category: 'Symbols',
            d: 'M 50 15 C 35 -5, 0 10, 0 38 C 0 65, 50 95, 50 95 C 50 95, 100 65, 100 38 C 100 10, 65 -5, 50 15 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'cross',
            name: 'Cross / Plus',
            category: 'Symbols',
            d: 'M 35 5 H 65 V 35 H 95 V 65 H 65 V 95 H 35 V 65 H 5 V 35 H 35 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'star-5',
            name: '5-Point Star',
            category: 'Symbols',
            d: 'M 50 5 L 61 38 L 96 38 L 68 59 L 79 92 L 50 71 L 21 92 L 32 59 L 4 38 L 39 38 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'sun',
            name: 'Sun / Radial Star',
            category: 'Symbols',
            d: 'M 50 20 A 15 15 0 1 0 50 50 A 15 15 0 1 0 50 20 Z M 50 0 L 54 12 L 68 3 L 64 16 L 80 12 L 72 23 L 89 25 L 77 34 L 92 41 L 78 48 L 91 58 L 76 61 L 86 73 L 71 72 L 77 86 L 63 80 L 64 95 L 53 85 L 50 100 L 47 85 L 36 95 L 37 80 L 23 86 L 29 72 L 14 73 L 24 61 L 9 58 L 22 48 L 8 41 L 23 34 L 11 25 L 28 23 L 20 12 L 36 16 L 32 3 L 46 12 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'moon',
            name: 'Crescent Moon',
            category: 'Symbols',
            d: 'M 60 5 C 25 15, 10 50, 30 85 C 45 100, 75 95, 90 80 C 65 80, 45 60, 48 35 C 50 20, 58 10, 60 5 Z',
            viewBox: '0 0 100 100'
        },

        // --- MECHANICAL & HARDWARE ---
        {
            id: 'gear-8',
            name: 'Gear (8-Tooth)',
            category: 'Mechanical',
            d: 'M 45 5 H 55 L 57 15 L 67 18 L 75 11 L 82 18 L 75 26 L 78 36 L 88 38 L 88 50 L 78 52 L 75 62 L 82 70 L 75 77 L 67 70 L 57 73 L 55 83 H 45 L 43 73 L 33 70 L 25 77 L 18 70 L 25 62 L 22 52 L 12 50 L 12 38 L 22 36 L 25 26 L 18 18 L 25 11 L 33 18 L 43 15 Z M 50 35 A 15 15 0 1 0 50 65 A 15 15 0 1 0 50 35 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'gear-12',
            name: 'Gear (12-Tooth)',
            category: 'Mechanical',
            d: 'M 46 4 H 54 L 56 12 L 62 14 L 68 8 L 74 13 L 71 20 L 77 24 L 84 20 L 88 27 L 83 33 L 87 38 L 95 38 L 96 46 L 88 48 L 88 54 L 96 56 L 94 64 L 86 64 L 83 70 L 88 76 L 82 82 L 76 77 L 70 81 L 72 89 L 64 92 L 60 85 L 54 87 L 52 95 H 44 L 42 87 L 36 85 L 32 92 L 24 88 L 27 81 L 21 77 L 15 82 L 9 76 L 14 70 L 11 64 L 3 64 L 3 56 L 11 54 L 11 48 L 3 46 L 4 38 L 12 38 L 14 32 L 9 27 L 14 20 L 21 24 L 26 20 L 23 13 L 29 8 L 35 14 L 41 12 Z M 50 38 A 12 12 0 1 0 50 62 A 12 12 0 1 0 50 38 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'ring',
            name: 'Washer / Ring',
            category: 'Mechanical',
            d: 'M 50 5 A 45 45 0 1 0 50 95 A 45 45 0 1 0 50 5 Z M 50 25 A 25 25 0 1 1 50 75 A 25 25 0 1 1 50 25 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'arc-pie',
            name: 'Arc / Pie Wedge (90°)',
            category: 'Mechanical',
            d: 'M 50 50 L 50 10 A 40 40 0 0 1 90 50 Z',
            viewBox: '0 0 100 100'
        },

        // --- ARROWS ---
        {
            id: 'arrow-right',
            name: 'Arrow Right',
            category: 'Arrows',
            d: 'M 10 35 H 60 V 15 L 95 50 L 60 85 V 65 H 10 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'arrow-double',
            name: 'Double Arrow',
            category: 'Arrows',
            d: 'M 35 15 L 5 50 L 35 85 V 65 H 65 V 85 L 95 50 L 65 15 V 35 H 35 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'chevron-right',
            name: 'Chevron Right',
            category: 'Arrows',
            d: 'M 30 10 L 70 50 L 30 90 L 45 90 L 85 50 L 45 10 Z',
            viewBox: '0 0 100 100'
        },

        // --- BADGES & LABELS ---
        {
            id: 'speech-bubble',
            name: 'Speech Bubble',
            category: 'Badges',
            d: 'M 10 15 H 90 A 10 10 0 0 1 100 25 V 65 A 10 10 0 0 1 90 75 H 45 L 25 95 V 75 H 10 A 10 10 0 0 1 0 65 V 25 A 10 10 0 0 1 10 15 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'badge-hex',
            name: 'Hexagon Badge',
            category: 'Badges',
            d: 'M 50 5 L 90 25 V 75 L 50 95 L 10 75 V 25 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'badge-shield',
            name: 'Shield Badge',
            category: 'Badges',
            d: 'M 50 5 L 90 20 V 55 C 90 75, 50 95, 50 95 C 50 95, 10 75, 10 55 V 20 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'ribbon',
            name: 'Banner Ribbon',
            category: 'Badges',
            d: 'M 10 20 H 90 L 80 45 L 90 70 H 10 L 20 45 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'tag',
            name: 'Gift Tag / Keyring',
            category: 'Badges',
            d: 'M 15 50 L 45 15 H 85 V 85 H 45 Z M 65 45 A 6 6 0 1 0 65 55 A 6 6 0 1 0 65 45 Z',
            viewBox: '0 0 100 100'
        },

        // --- ICONS & EMOJIS (Laser-Safe Vector Outlines) ---
        {
            id: 'icon-bolt',
            name: 'Lightning Bolt',
            category: 'Icons',
            d: 'M 55 5 L 15 55 H 45 L 35 95 L 85 45 H 55 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'icon-flame',
            name: 'Fire / Flame',
            category: 'Icons',
            d: 'M 50 5 C 45 25, 25 35, 25 60 C 25 78, 38 95, 55 95 C 75 95, 85 75, 85 55 C 85 35, 75 25, 70 15 C 68 25, 60 30, 55 35 C 55 20, 52 10, 50 5 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'icon-wrench',
            name: 'Wrench Tool',
            category: 'Icons',
            d: 'M 80 15 C 70 12, 60 17, 56 25 L 20 61 C 18 63, 18 67, 20 69 L 31 80 C 33 82, 37 82, 39 80 L 75 44 C 83 40, 88 30, 85 20 L 75 30 L 65 30 L 65 20 L 75 10 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'icon-scissors',
            name: 'Scissors / Cutter',
            category: 'Icons',
            d: 'M 25 15 L 50 45 L 75 15 L 85 22 L 55 50 L 85 78 L 75 85 L 50 55 L 30 75 A 12 12 0 1 1 20 60 L 42 48 L 20 40 A 12 12 0 1 1 25 15 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'icon-leaf',
            name: 'Eco Leaf',
            category: 'Icons',
            d: 'M 85 15 C 50 15, 20 40, 15 85 C 60 80, 85 50, 85 15 Z M 20 80 Q 50 50 80 20',
            viewBox: '0 0 100 100'
        },
        {
            id: 'icon-home',
            name: 'House / Building',
            category: 'Icons',
            d: 'M 50 10 L 90 45 H 80 V 90 H 60 V 65 H 40 V 90 H 20 V 45 H 10 Z',
            viewBox: '0 0 100 100'
        },
        {
            id: 'icon-flag',
            name: 'Pennant Flag',
            category: 'Icons',
            d: 'M 20 10 H 85 L 65 35 L 85 60 H 20 V 95 H 12 V 10 Z',
            viewBox: '0 0 100 100'
        }
    ];

    Object.assign(SVGEditor.prototype, {
        initShapeLibrary() {
            const browseBtn = document.getElementById('browseShapesBtn');
            if (browseBtn) {
                browseBtn.addEventListener('click', () => this.showShapeLibraryModal());
            }
        },

        showShapeLibraryModal() {
            let modal = document.getElementById('shapeLibraryModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'shapeLibraryModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="width: 760px; max-width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3e3e42; padding-bottom: 12px; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 20px;">📐</span>
                                <h2 style="margin: 0; font-size: 18px; color: #fff;">Shape & Preset Library</h2>
                            </div>
                            <button id="closeShapeLibraryBtn" style="background: transparent; border: none; color: #aaa; font-size: 22px; cursor: pointer;">&times;</button>
                        </div>
                        
                        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                            <input type="text" id="shapeLibrarySearch" placeholder="Search shapes (e.g. gear, heart, arrow, wrench, leaf)..." style="flex: 1; padding: 8px 12px; background: #1e1e1e; border: 1px solid #3e3e42; color: #fff; border-radius: 4px; font-size: 13px;">
                        </div>

                        <!-- Category Filter Chips -->
                        <div id="shapeCategoryChips" style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 1px solid #2d2d30;">
                            <button class="chip active" data-cat="All" style="background: #007acc; border: none; color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 11px; cursor: pointer;">All</button>
                            <button class="chip" data-cat="Symbols" style="background: #2d2d30; border: none; color: #bbb; padding: 4px 10px; border-radius: 12px; font-size: 11px; cursor: pointer;">Symbols</button>
                            <button class="chip" data-cat="Mechanical" style="background: #2d2d30; border: none; color: #bbb; padding: 4px 10px; border-radius: 12px; font-size: 11px; cursor: pointer;">Mechanical</button>
                            <button class="chip" data-cat="Arrows" style="background: #2d2d30; border: none; color: #bbb; padding: 4px 10px; border-radius: 12px; font-size: 11px; cursor: pointer;">Arrows</button>
                            <button class="chip" data-cat="Badges" style="background: #2d2d30; border: none; color: #bbb; padding: 4px 10px; border-radius: 12px; font-size: 11px; cursor: pointer;">Badges</button>
                            <button class="chip" data-cat="Icons" style="background: #2d2d30; border: none; color: #bbb; padding: 4px 10px; border-radius: 12px; font-size: 11px; cursor: pointer;">Icons & Emojis</button>
                        </div>

                        <div id="shapeLibraryGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; overflow-y: auto; padding: 6px; flex: 1;">
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('#closeShapeLibraryBtn').addEventListener('click', () => modal.style.display = 'none');
                modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

                const search = modal.querySelector('#shapeLibrarySearch');
                search.addEventListener('input', (e) => this.renderShapeLibraryCards(e.target.value, this._activeShapeCategory || 'All'));

                const chips = modal.querySelectorAll('#shapeCategoryChips .chip');
                chips.forEach(chip => {
                    chip.addEventListener('click', () => {
                        chips.forEach(c => {
                            c.classList.remove('active');
                            c.style.background = '#2d2d30';
                            c.style.color = '#bbb';
                        });
                        chip.classList.add('active');
                        chip.style.background = '#007acc';
                        chip.style.color = '#fff';
                        this._activeShapeCategory = chip.dataset.cat;
                        this.renderShapeLibraryCards(search.value, chip.dataset.cat);
                    });
                });
            }

            this._activeShapeCategory = 'All';
            this.renderShapeLibraryCards('', 'All');
            modal.style.display = 'flex';
        },

        renderShapeLibraryCards(filter = '', category = 'All') {
            const grid = document.getElementById('shapeLibraryGrid');
            if (!grid) return;
            grid.innerHTML = '';

            const q = filter.toLowerCase().trim();
            const filtered = SHAPE_PRESETS.filter(s => {
                const matchesCat = category === 'All' || s.category === category;
                const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
                return matchesCat && matchesSearch;
            });

            if (filtered.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">No matching shapes found.</div>';
                return;
            }

            filtered.forEach(preset => {
                const card = document.createElement('div');
                card.style.cssText = 'background: #252528; border: 1px solid #3e3e42; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: all 0.15s;';
                card.innerHTML = `
                    <svg viewBox="${preset.viewBox}" style="width: 50px; height: 50px; stroke: #9cdcfe; fill: rgba(0, 122, 204, 0.2); stroke-width: 2;">
                        <path d="${preset.d}" fill-rule="evenodd" />
                    </svg>
                    <span style="font-size: 11px; color: #ccc; margin-top: 8px; text-align: center; font-weight: 500;">${preset.name}</span>
                    <span style="font-size: 9px; color: #777; margin-top: 2px;">${preset.category}</span>
                `;

                card.addEventListener('mouseenter', () => {
                    card.style.borderColor = '#007acc';
                    card.style.background = '#2d2d32';
                    card.style.transform = 'translateY(-2px)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.borderColor = '#3e3e42';
                    card.style.background = '#252528';
                    card.style.transform = 'translateY(0)';
                });

                card.addEventListener('click', () => {
                    this.insertPresetShape(preset);
                    document.getElementById('shapeLibraryModal').style.display = 'none';
                });

                grid.appendChild(card);
            });
        },

        insertPresetShape(preset) {
            const ns = "http://www.w3.org/2000/svg";
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', preset.d);
            path.setAttribute('fill', this.laserMode ? 'none' : '#4CAF50');
            path.setAttribute('stroke', this.laserMode ? '#ff0000' : '#000000');
            path.setAttribute('stroke-width', this.laserMode ? '0.1' : '1.5');
            path.setAttribute('fill-rule', 'evenodd');

            // Center in current viewBox
            const cx = this.viewBox.x + this.viewBox.width / 2 - 50;
            const cy = this.viewBox.y + this.viewBox.height / 2 - 50;
            path.setAttribute('transform', `translate(${Math.round(cx)}, ${Math.round(cy)})`);

            this.canvas.appendChild(path);
            this.clearSelection();
            this.selectedElements = [path];
            this.selectedElement = path;
            path.style.outline = '2px dashed #007acc';

            this.updateSelectionHandles();
            this.updateContextMenu();
            this.saveState();
        },

        // Helper to create parametric Arc or Pie
        createArcPieWedge(startAngleDeg = 0, sweepAngleDeg = 90, innerR = 0, outerR = 50) {
            const toRad = deg => (deg * Math.PI) / 180;
            const a1 = toRad(startAngleDeg);
            const a2 = toRad(startAngleDeg + sweepAngleDeg);

            const x1 = outerR * Math.cos(a1);
            const y1 = outerR * Math.sin(a1);
            const x2 = outerR * Math.cos(a2);
            const y2 = outerR * Math.sin(a2);

            const largeArc = sweepAngleDeg > 180 ? 1 : 0;
            let d = '';

            if (innerR <= 0) {
                // Pie slice
                d = `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
            } else {
                // Ring segment / arc
                const ix1 = innerR * Math.cos(a1);
                const iy1 = innerR * Math.sin(a1);
                const ix2 = innerR * Math.cos(a2);
                const iy2 = innerR * Math.sin(a2);
                d = `M ${ix1.toFixed(2)} ${iy1.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
            }

            const ns = "http://www.w3.org/2000/svg";
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', d);
            path.setAttribute('fill', this.laserMode ? 'none' : '#2196F3');
            path.setAttribute('stroke', this.laserMode ? '#ff0000' : '#000000');
            path.setAttribute('stroke-width', this.laserMode ? '0.1' : '1.5');

            const cx = this.viewBox.x + this.viewBox.width / 2;
            const cy = this.viewBox.y + this.viewBox.height / 2;
            path.setAttribute('transform', `translate(${Math.round(cx)}, ${Math.round(cy)})`);

            this.canvas.appendChild(path);
            this.clearSelection();
            this.selectedElements = [path];
            this.selectedElement = path;
            path.style.outline = '2px dashed #007acc';

            this.updateSelectionHandles();
            this.saveState();
        }
    });
})();
