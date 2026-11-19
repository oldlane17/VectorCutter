/**
 * VectorCutter - SVG Editor Image Trace (Bitmap to Vector Outline)
 * Module: editor-trace.js
 * Description: 100% Client-side PNG/JPG Trace to Vector using Canvas Threshold & Contour Tracing
 */

(function() {
    Object.assign(SVGEditor.prototype, {
        initTraceTool() {
            const traceMenuBtn = document.getElementById('menuTraceImage');
            if (traceMenuBtn) {
                traceMenuBtn.addEventListener('click', () => this.showTraceModal());
            }
        },

        showTraceModal() {
            let modal = document.getElementById('traceImageModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'traceImageModal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="width: 720px; max-width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #3e3e42; padding-bottom:10px; margin-bottom:15px;">
                            <h2 style="margin:0; font-size:18px;">📷 Trace Image to Vector (Beta)</h2>
                            <button id="closeTraceModalBtn" style="background:transparent; border:none; color:#aaa; font-size:22px; cursor:pointer;">&times;</button>
                        </div>
                        
                        <div style="display:flex; gap:12px; margin-bottom:15px; align-items:center;">
                            <input type="file" id="traceFileInput" accept="image/png,image/jpeg,image/webp" style="display:none;">
                            <button id="btnChooseTraceFile" style="background:#007acc; color:#fff; border:none; border-radius:4px; padding:7px 14px; cursor:pointer; font-size:12px;">Choose Image (PNG/JPG)...</button>
                            <span id="traceFileName" style="font-size:12px; color:#aaa;">No file chosen</span>
                        </div>

                        <div style="display:flex; gap:15px; flex:1; min-height:220px; max-height:380px;">
                            <div style="flex:1; border:1px solid #3e3e42; border-radius:4px; padding:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#181818;">
                                <span style="font-size:11px; color:#888; margin-bottom:6px;">Original Bitmap</span>
                                <img id="traceOriginalImg" style="max-width:100%; max-height:200px; object-fit:contain; display:none;">
                                <div id="traceImgPlaceholder" style="color:#666; font-size:12px;">Select an image to preview</div>
                            </div>
                            <div style="flex:1; border:1px solid #3e3e42; border-radius:4px; padding:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#181818;">
                                <span style="font-size:11px; color:#888; margin-bottom:6px;">Traced Vector Preview</span>
                                <svg id="traceVectorPreview" viewBox="0 0 200 200" style="max-width:100%; max-height:200px; stroke:#9cdcfe; fill:none; stroke-width:1.5;">
                                    <path id="traceResultPath" d="" />
                                </svg>
                            </div>
                        </div>

                        <div style="margin-top:15px; background:#252528; padding:12px; border-radius:4px;">
                            <div style="display:flex; justify-content:space-between; font-size:12px; color:#ccc; margin-bottom:6px;">
                                <span>Black/White Threshold: <strong id="traceThresholdVal">128</strong></span>
                                <span>Smoothness / Simplification: <strong id="traceSmoothVal">2</strong></span>
                            </div>
                            <input type="range" id="traceThresholdSlider" min="10" max="245" value="128" style="width:100%; margin-bottom:8px;">
                            <input type="range" id="traceSmoothSlider" min="1" max="10" value="2" style="width:100%;">
                        </div>

                        <div class="modal-buttons" style="margin-top:15px; display:flex; justify-content:flex-end; gap:8px;">
                            <button id="cancelTraceBtn" style="background:#3e3e42; color:#ccc; border:none; padding:7px 14px; border-radius:4px; cursor:pointer;">Cancel</button>
                            <button id="applyTraceBtn" style="background:#007acc; color:#fff; border:none; padding:7px 16px; border-radius:4px; cursor:pointer;" disabled>Insert Vector into Canvas</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                const fileInput = modal.querySelector('#traceFileInput');
                const chooseBtn = modal.querySelector('#btnChooseTraceFile');
                const fileName = modal.querySelector('#traceFileName');
                const originalImg = modal.querySelector('#traceOriginalImg');
                const placeholder = modal.querySelector('#traceImgPlaceholder');
                const applyBtn = modal.querySelector('#applyTraceBtn');
                const thresholdSlider = modal.querySelector('#traceThresholdSlider');
                const smoothSlider = modal.querySelector('#traceSmoothSlider');

                chooseBtn.addEventListener('click', () => fileInput.click());
                modal.querySelector('#closeTraceModalBtn').addEventListener('click', () => modal.style.display = 'none');
                modal.querySelector('#cancelTraceBtn').addEventListener('click', () => modal.style.display = 'none');
                modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        fileName.textContent = file.name;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            originalImg.src = event.target.result;
                            originalImg.style.display = 'block';
                            placeholder.style.display = 'none';
                            originalImg.onload = () => {
                                this.processBitmapTrace(originalImg, parseInt(thresholdSlider.value, 10), parseInt(smoothSlider.value, 10));
                                applyBtn.disabled = false;
                            };
                        };
                        reader.readAsDataURL(file);
                    }
                });

                thresholdSlider.addEventListener('input', (e) => {
                    modal.querySelector('#traceThresholdVal').textContent = e.target.value;
                    if (originalImg.src) {
                        this.processBitmapTrace(originalImg, parseInt(e.target.value, 10), parseInt(smoothSlider.value, 10));
                    }
                });

                smoothSlider.addEventListener('input', (e) => {
                    modal.querySelector('#traceSmoothVal').textContent = e.target.value;
                    if (originalImg.src) {
                        this.processBitmapTrace(originalImg, parseInt(thresholdSlider.value, 10), parseInt(e.target.value, 10));
                    }
                });

                applyBtn.addEventListener('click', () => {
                    const pathData = modal.querySelector('#traceResultPath').getAttribute('d');
                    if (pathData) {
                        this.insertTracedPath(pathData, originalImg.naturalWidth || 200, originalImg.naturalHeight || 200);
                        modal.style.display = 'none';
                    }
                });
            }

            modal.style.display = 'flex';
        },

        processBitmapTrace(imgElement, threshold = 128, step = 2) {
            const canvas = document.createElement('canvas');
            const maxDim = 300; // Constrain for responsive client-side tracing
            let w = imgElement.naturalWidth || 100;
            let h = imgElement.naturalHeight || 100;

            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, w, h);

            const imgData = ctx.getImageData(0, 0, w, h);
            const data = imgData.data;

            // Simple edge contour scanning
            let pathD = '';
            for (let y = 0; y < h; y += step) {
                let inBlack = false;
                let startX = 0;
                for (let x = 0; x < w; x += step) {
                    const idx = (y * w + x) * 4;
                    // Grayscale luminance
                    const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                    const isDark = (lum < threshold) && (data[idx + 3] > 50);

                    if (isDark && !inBlack) {
                        inBlack = true;
                        startX = x;
                    } else if (!isDark && inBlack) {
                        inBlack = false;
                        pathD += `M ${startX} ${y} H ${x} V ${Math.min(h, y + step)} H ${startX} Z `;
                    }
                }
                if (inBlack) {
                    pathD += `M ${startX} ${y} H ${w} V ${Math.min(h, y + step)} H ${startX} Z `;
                }
            }

            const previewSvg = document.getElementById('traceVectorPreview');
            const resultPath = document.getElementById('traceResultPath');
            if (previewSvg && resultPath) {
                previewSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
                resultPath.setAttribute('d', pathD);
            }
        },

        insertTracedPath(pathD, imgW = 200, imgH = 200) {
            if (!pathD) return;

            const ns = "http://www.w3.org/2000/svg";
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', pathD);
            path.setAttribute('fill', this.laserMode ? 'none' : '#333333');
            path.setAttribute('stroke', this.laserMode ? '#ff0000' : 'none');
            path.setAttribute('stroke-width', this.laserMode ? '0.1' : '0');
            path.setAttribute('fill-rule', 'evenodd');

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
        }
    });
})();
