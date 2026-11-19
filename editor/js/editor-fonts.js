/**
 * VectorCutter - SVG Editor Font Registry & Rich Font Picker
 * Module: editor-fonts.js
 * Description: 40+ Laser-Friendly Fonts, OFL Registry, Lazy Loading, User Uploads, Searchable Font Picker
 */

(function() {
    const FONT_REGISTRY = [
        // --- SANS ---
        { id: 'roboto', label: 'Roboto', family: 'Roboto, sans-serif', category: 'Sans', license: 'Apache 2.0', source: 'Google Fonts' },
        { id: 'open-sans', label: 'Open Sans', family: '"Open Sans", sans-serif', category: 'Sans', license: 'OFL', source: 'Google Fonts' },
        { id: 'montserrat', label: 'Montserrat', family: 'Montserrat, sans-serif', category: 'Sans', license: 'OFL', source: 'Google Fonts' },
        { id: 'lato', label: 'Lato', family: 'Lato, sans-serif', category: 'Sans', license: 'OFL', source: 'Google Fonts' },
        { id: 'oswald', label: 'Oswald', family: 'Oswald, sans-serif', category: 'Sans', license: 'OFL', source: 'Google Fonts' },
        { id: 'raleway', label: 'Raleway', family: 'Raleway, sans-serif', category: 'Sans', license: 'OFL', source: 'Google Fonts' },
        { id: 'poppins', label: 'Poppins', family: 'Poppins, sans-serif', category: 'Sans', license: 'OFL', source: 'Google Fonts' },
        { id: 'inter', label: 'Inter', family: 'Inter, sans-serif', category: 'Sans', license: 'OFL', source: 'Google Fonts' },
        { id: 'arial', label: 'Arial (System)', family: 'Arial, sans-serif', category: 'Sans', license: 'System', source: 'System' },

        // --- SERIF ---
        { id: 'playfair', label: 'Playfair Display', family: '"Playfair Display", serif', category: 'Serif', license: 'OFL', source: 'Google Fonts' },
        { id: 'merriweather', label: 'Merriweather', family: 'Merriweather, serif', category: 'Serif', license: 'OFL', source: 'Google Fonts' },
        { id: 'lora', label: 'Lora', family: 'Lora, serif', category: 'Serif', license: 'OFL', source: 'Google Fonts' },
        { id: 'cinzel', label: 'Cinzel', family: 'Cinzel, serif', category: 'Serif', license: 'OFL', source: 'Google Fonts' },
        { id: 'cormorant', label: 'Cormorant Garamond', family: '"Cormorant Garamond", serif', category: 'Serif', license: 'OFL', source: 'Google Fonts' },
        { id: 'pt-serif', label: 'PT Serif', family: '"PT Serif", serif', category: 'Serif', license: 'OFL', source: 'Google Fonts' },
        { id: 'times', label: 'Times New Roman (System)', family: '"Times New Roman", serif', category: 'Serif', license: 'System', source: 'System' },

        // --- SLAB ---
        { id: 'roboto-slab', label: 'Roboto Slab', family: '"Roboto Slab", serif', category: 'Slab', license: 'Apache 2.0', source: 'Google Fonts' },
        { id: 'arvo', label: 'Arvo', family: 'Arvo, serif', category: 'Slab', license: 'OFL', source: 'Google Fonts' },
        { id: 'alfa-slab', label: 'Alfa Slab One', family: '"Alfa Slab One", cursive', category: 'Slab', license: 'OFL', source: 'Google Fonts' },
        { id: 'zillaslab', label: 'Zilla Slab', family: '"Zilla Slab", serif', category: 'Slab', license: 'OFL', source: 'Google Fonts' },
        { id: 'rokkit', label: 'Rokkitt', family: 'Rokkitt, serif', category: 'Slab', license: 'OFL', source: 'Google Fonts' },

        // --- SCRIPT / HANDWRITING ---
        { id: 'pacifico', label: 'Pacifico', family: 'Pacifico, cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },
        { id: 'dancing-script', label: 'Dancing Script', family: '"Dancing Script", cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },
        { id: 'great-vibes', label: 'Great Vibes', family: '"Great Vibes", cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },
        { id: 'caveat', label: 'Caveat', family: 'Caveat, cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },
        { id: 'satisfy', label: 'Satisfy', family: 'Satisfy, cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },
        { id: 'sacramento', label: 'Sacramento', family: 'Sacramento, cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },
        { id: 'hurricane', label: 'Hurricane', family: 'Hurricane, cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },
        { id: 'alex-brush', label: 'Alex Brush', family: '"Alex Brush", cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },
        { id: 'allura', label: 'Allura', family: 'Allura, cursive', category: 'Script', license: 'OFL', source: 'Google Fonts' },

        // --- DISPLAY ---
        { id: 'bebas-neue', label: 'Bebas Neue', family: '"Bebas Neue", sans-serif', category: 'Display', license: 'OFL', source: 'Google Fonts' },
        { id: 'righteous', label: 'Righteous', family: 'Righteous, cursive', category: 'Display', license: 'OFL', source: 'Google Fonts' },
        { id: 'bungee', label: 'Bungee', family: 'Bungee, cursive', category: 'Display', license: 'OFL', source: 'Google Fonts' },
        { id: 'monoton', label: 'Monoton', family: 'Monoton, cursive', category: 'Display', license: 'OFL', source: 'Google Fonts' },
        { id: 'lobster', label: 'Lobster', family: 'Lobster, cursive', category: 'Display', license: 'OFL', source: 'Google Fonts' },
        { id: 'fredoka-one', label: 'Fredoka One', family: '"Fredoka One", cursive', category: 'Display', license: 'OFL', source: 'Google Fonts' },
        { id: 'shrikhand', label: 'Shrikhand', family: 'Shrikhand, cursive', category: 'Display', license: 'OFL', source: 'Google Fonts' },

        // --- MONOSPACE ---
        { id: 'fira-code', label: 'Fira Code', family: '"Fira Code", monospace', category: 'Monospace', license: 'OFL', source: 'Google Fonts' },
        { id: 'source-code-pro', label: 'Source Code Pro', family: '"Source Code Pro", monospace', category: 'Monospace', license: 'OFL', source: 'Google Fonts' },
        { id: 'space-mono', label: 'Space Mono', family: '"Space Mono", monospace', category: 'Monospace', license: 'OFL', source: 'Google Fonts' },
        { id: 'courier', label: 'Courier New (System)', family: '"Courier New", monospace', category: 'Monospace', license: 'System', source: 'System' },

        // --- STENCIL (Laser Bridge Friendly) ---
        { id: 'sirin-stencil', label: 'Sirin Stencil', family: '"Sirin Stencil", cursive', category: 'Stencil', license: 'OFL', source: 'Google Fonts' },
        { id: 'allerta-stencil', label: 'Allerta Stencil', family: '"Allerta Stencil", sans-serif', category: 'Stencil', license: 'OFL', source: 'Google Fonts' },
        { id: 'stardos-stencil', label: 'Stardos Stencil', family: '"Stardos Stencil", cursive', category: 'Stencil', license: 'OFL', source: 'Google Fonts' },

        // --- SINGLE-LINE / ENGRAVING ---
        { id: 'hershey-sans', label: 'Hershey Sans (Engrave)', family: '"Hershey Sans", sans-serif', category: 'Single-line', license: 'Public Domain', source: 'Hershey', singleLine: true },
        { id: 'hershey-serif', label: 'Hershey Serif (Engrave)', family: '"Hershey Serif", serif', category: 'Single-line', license: 'Public Domain', source: 'Hershey', singleLine: true },
        { id: 'hershey-script', label: 'Hershey Script (Engrave)', family: '"Hershey Script", cursive', category: 'Single-line', license: 'Public Domain', source: 'Hershey', singleLine: true }
    ];

    (typeof window !== 'undefined' ? window : global).VC_FONT_REGISTRY = FONT_REGISTRY;

    Object.assign(SVGEditor.prototype, {
        initFonts() {
            this.fontRegistry = [...FONT_REGISTRY];
            this.loadedFonts = new Set(['Arial', 'Times New Roman', 'Courier New']);
            this.customFonts = [];
            this.recentFonts = JSON.parse(localStorage.getItem('vc_recent_fonts') || '["Arial","Montserrat","Pacifico"]');
            this.favoriteFonts = JSON.parse(localStorage.getItem('vc_favorite_fonts') || '["Montserrat","Pacifico"]');
        },

        async loadFont(fontFamily) {
            const fontObj = this.fontRegistry.find(f => f.label === fontFamily || f.family.includes(fontFamily));
            if (!fontObj || fontObj.source === 'System' || this.loadedFonts.has(fontObj.label)) {
                return true;
            }

            try {
                const fontNameClean = fontObj.label.replace(/\s+/g, '+');
                const linkId = `font-link-${fontObj.id}`;
                if (!document.getElementById(linkId)) {
                    const link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    link.href = `https://fonts.googleapis.com/css2?family=${fontNameClean}:ital,wght@0,400;0,700;1,400&display=swap`;
                    document.head.appendChild(link);
                }
                if (document.fonts && document.fonts.ready) {
                    await document.fonts.ready;
                }
                this.loadedFonts.add(fontObj.label);
                return true;
            } catch (err) {
                console.warn('Failed to load font:', fontObj.label, err);
                return false;
            }
        },

        async registerUserFont(file) {
            if (!file) return null;
            const fontName = file.name.replace(/\.[^/.]+$/, "");
            try {
                const buffer = await file.arrayBuffer();
                const fontFace = new FontFace(fontName, buffer);
                const loadedFace = await fontFace.load();
                document.fonts.add(loadedFace);

                const newFontObj = {
                    id: `user-${Date.now()}`,
                    label: fontName,
                    family: `"${fontName}", sans-serif`,
                    category: 'Uploaded',
                    license: 'User Provided',
                    source: 'User'
                };

                this.fontRegistry.unshift(newFontObj);
                this.customFonts.push(newFontObj);
                this.loadedFonts.add(fontName);
                this.recordRecentFont(fontName);

                const fontSelect = document.getElementById('contextTextFontFamily');
                if (fontSelect) {
                    this.populateFontSelector(fontSelect, newFontObj.family);
                    fontSelect.dispatchEvent(new Event('change'));
                }
                return fontName;
            } catch (err) {
                console.error('Failed to load uploaded font:', err);
                alert(`Could not load font file: ${err.message}`);
                return null;
            }
        },

        recordRecentFont(fontLabel) {
            this.recentFonts = [fontLabel, ...this.recentFonts.filter(f => f !== fontLabel)].slice(0, 8);
            localStorage.setItem('vc_recent_fonts', JSON.stringify(this.recentFonts));
        },

        toggleFavoriteFont(fontLabel) {
            if (this.favoriteFonts.includes(fontLabel)) {
                this.favoriteFonts = this.favoriteFonts.filter(f => f !== fontLabel);
            } else {
                this.favoriteFonts.push(fontLabel);
            }
            localStorage.setItem('vc_favorite_fonts', JSON.stringify(this.favoriteFonts));
        },

        populateFontSelector(selectElement, currentFamily) {
            if (!selectElement) return;
            selectElement.innerHTML = '';

            // Group: Favorites & Recent
            const optGroupFav = document.createElement('optgroup');
            optGroupFav.label = '★ Favorites & Recent';

            const seenFavs = new Set();
            [...this.favoriteFonts, ...this.recentFonts].forEach(fName => {
                if (seenFavs.has(fName)) return;
                seenFavs.add(fName);
                const font = this.fontRegistry.find(f => f.label === fName || f.id === fName);
                if (font) {
                    const opt = document.createElement('option');
                    opt.value = font.family;
                    opt.textContent = font.label;
                    if (currentFamily && currentFamily.includes(font.label)) opt.selected = true;
                    optGroupFav.appendChild(opt);
                }
            });
            if (optGroupFav.children.length > 0) selectElement.appendChild(optGroupFav);

            // Group: Custom Uploaded
            if (this.customFonts && this.customFonts.length > 0) {
                const groupUpload = document.createElement('optgroup');
                groupUpload.label = '📁 Uploaded Fonts';
                this.customFonts.forEach(font => {
                    const opt = document.createElement('option');
                    opt.value = font.family;
                    opt.textContent = font.label;
                    if (currentFamily && currentFamily.includes(font.label)) opt.selected = true;
                    groupUpload.appendChild(opt);
                });
                selectElement.appendChild(groupUpload);
            }

            // Categories
            ['Sans', 'Serif', 'Slab', 'Script', 'Display', 'Monospace', 'Stencil', 'Single-line'].forEach(cat => {
                const group = document.createElement('optgroup');
                group.label = cat;
                this.fontRegistry.filter(f => f.category === cat).forEach(font => {
                    const opt = document.createElement('option');
                    opt.value = font.family;
                    opt.textContent = font.label + (font.singleLine ? ' (Engrave)' : '');
                    if (currentFamily && (currentFamily === font.family || currentFamily.includes(font.label))) {
                        opt.selected = true;
                    }
                    group.appendChild(opt);
                });
                selectElement.appendChild(group);
            });
        },

        showFontPickerModal(onSelectCallback = null) {
            let modal = document.getElementById('fontPickerModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'fontPickerModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="width: 720px; max-width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3e3e42; padding-bottom:10px; margin-bottom:12px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:20px;">🔤</span>
                                <h2 style="margin:0; font-size:18px;">Font Library & Picker</h2>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="file" id="fontUploadInput" accept=".ttf,.otf,.woff2" style="display:none;">
                                <button id="btnUploadFont" style="background:#2d2d30; border:1px solid #3e3e42; color:#fff; padding:5px 10px; border-radius:4px; font-size:11px; cursor:pointer;" title="Upload custom TTF/OTF/WOFF2 font">+ Upload Font...</button>
                                <button id="closeFontPickerBtn" style="background:transparent; border:none; color:#aaa; font-size:22px; cursor:pointer;">&times;</button>
                            </div>
                        </div>

                        <div style="display:flex; gap:8px; margin-bottom:10px;">
                            <input type="text" id="fontSearchInput" placeholder="Search 40+ fonts (e.g. Montserrat, Pacifico, Fira, Stencil)..." style="flex:1; padding:8px 12px; background:#1e1e1e; border:1px solid #3e3e42; color:#fff; border-radius:4px; font-size:13px;">
                        </div>

                        <!-- Category Filter Chips -->
                        <div id="fontCategoryChips" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:10px; border-bottom:1px solid #2d2d30;">
                            <button class="chip active" data-cat="All" style="background:#007acc; border:none; color:#fff; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">All</button>
                            <button class="chip" data-cat="Favorites" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">★ Favorites</button>
                            <button class="chip" data-cat="Sans" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">Sans</button>
                            <button class="chip" data-cat="Serif" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">Serif</button>
                            <button class="chip" data-cat="Slab" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">Slab</button>
                            <button class="chip" data-cat="Script" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">Script / Cursive</button>
                            <button class="chip" data-cat="Display" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">Display</button>
                            <button class="chip" data-cat="Monospace" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">Monospace</button>
                            <button class="chip" data-cat="Stencil" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">Stencil</button>
                            <button class="chip" data-cat="Single-line" style="background:#2d2d30; border:none; color:#bbb; padding:4px 10px; border-radius:12px; font-size:11px; cursor:pointer;">Single-line (Engrave)</button>
                        </div>

                        <div id="fontPickerList" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px; padding:4px;">
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('#closeFontPickerBtn').addEventListener('click', () => modal.style.display = 'none');
                modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

                const uploadBtn = modal.querySelector('#btnUploadFont');
                const uploadInput = modal.querySelector('#fontUploadInput');
                uploadBtn.addEventListener('click', () => uploadInput.click());
                uploadInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const loadedName = await this.registerUserFont(file);
                        if (loadedName) {
                            this.renderFontPickerCards('', this._activeFontCategory || 'All', onSelectCallback);
                        }
                    }
                });

                const search = modal.querySelector('#fontSearchInput');
                search.addEventListener('input', (e) => this.renderFontPickerCards(e.target.value, this._activeFontCategory || 'All', onSelectCallback));

                // Keyboard navigation
                search.addEventListener('keydown', (e) => {
                    const items = modal.querySelectorAll('.font-card-item');
                    if (e.key === 'ArrowDown' && items.length > 0) {
                        e.preventDefault();
                        items[0].focus();
                    } else if (e.key === 'Enter' && items.length > 0) {
                        e.preventDefault();
                        items[0].click();
                    }
                });

                const chips = modal.querySelectorAll('#fontCategoryChips .chip');
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
                        this._activeFontCategory = chip.dataset.cat;
                        this.renderFontPickerCards(search.value, chip.dataset.cat, onSelectCallback);
                    });
                });
            }

            this._activeFontCategory = 'All';
            this.renderFontPickerCards('', 'All', onSelectCallback);
            modal.style.display = 'flex';
            setTimeout(() => {
                const s = modal.querySelector('#fontSearchInput');
                if (s) s.focus();
            }, 50);
        },

        renderFontPickerCards(query = '', category = 'All', onSelectCallback = null) {
            const list = document.getElementById('fontPickerList');
            if (!list) return;
            list.innerHTML = '';

            const q = query.toLowerCase().trim();
            const filtered = this.fontRegistry.filter(f => {
                const matchesCat = category === 'All' 
                    || (category === 'Favorites' && this.favoriteFonts.includes(f.label))
                    || f.category === category;
                const matchesSearch = !q || f.label.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
                return matchesCat && matchesSearch;
            });

            if (filtered.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#888; padding:30px;">No matching fonts found.</div>';
                return;
            }

            filtered.forEach((font) => {
                const item = document.createElement('div');
                item.className = 'font-card-item';
                item.tabIndex = 0;
                item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #3e3e42; border-radius:5px; padding:10px 14px; cursor:pointer; transition:all 0.15s; outline:none;';

                const isFav = this.favoriteFonts.includes(font.label);

                item.innerHTML = `
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span style="font-size:13px; font-weight:bold; color:#fff;">${font.label}</span>
                            <span style="font-size:10px; color:#888; background:#2d2d30; padding:2px 6px; border-radius:3px;">${font.category}</span>
                            ${font.singleLine ? '<span style="font-size:10px; color:#9cdcfe; background:#103854; padding:2px 6px; border-radius:3px;">Single-Line / Engrave</span>' : ''}
                        </div>
                        <div style="font-size:18px; color:#ccc; font-family:${font.family}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:540px;">
                            The quick brown fox jumps 123
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="font-fav-star" title="Toggle Favorite" style="cursor:pointer; font-size:16px; color:${isFav ? '#ffc107' : '#555'};">${isFav ? '★' : '☆'}</span>
                    </div>
                `;

                // Hover & focus styles
                item.addEventListener('mouseenter', () => {
                    item.style.borderColor = '#007acc';
                    item.style.background = '#252528';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.borderColor = '#3e3e42';
                    item.style.background = '#1e1e1e';
                });
                item.addEventListener('focus', () => {
                    item.style.borderColor = '#007acc';
                    item.style.background = '#252528';
                });
                item.addEventListener('blur', () => {
                    item.style.borderColor = '#3e3e42';
                    item.style.background = '#1e1e1e';
                });

                // Toggle favorite
                const star = item.querySelector('.font-fav-star');
                star.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFavoriteFont(font.label);
                    const nowFav = this.favoriteFonts.includes(font.label);
                    star.textContent = nowFav ? '★' : '☆';
                    star.style.color = nowFav ? '#ffc107' : '#555';
                });

                // Select font
                const doSelect = async () => {
                    await this.loadFont(font.label);
                    this.recordRecentFont(font.label);

                    if (onSelectCallback) {
                        onSelectCallback(font);
                    } else if (this.selectedElement && this.selectedElement.tagName.toLowerCase() === 'text') {
                        this.selectedElement.setAttribute('font-family', font.family);
                        const selectEl = document.getElementById('contextTextFontFamily');
                        if (selectEl) {
                            this.populateFontSelector(selectEl, font.family);
                        }
                        this.updateSelectionHandles();
                        this.updateContextMenuValues();
                        this.saveState();
                    }

                    document.getElementById('fontPickerModal').style.display = 'none';
                };

                item.addEventListener('click', doSelect);
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        doSelect();
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (item.nextElementSibling) item.nextElementSibling.focus();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (item.previousElementSibling) item.previousElementSibling.focus();
                        else {
                            const s = document.getElementById('fontSearchInput');
                            if (s) s.focus();
                        }
                    }
                });

                list.appendChild(item);
            });
        }

    });
})();
