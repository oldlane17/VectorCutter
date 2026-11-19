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
        }
    });
})();
