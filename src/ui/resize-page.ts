import { ICONS } from './icons';
import { resizeImage, RESIZE_PRESETS } from '../tools/resizer';
import type { ToolFile, ResampleMethod } from '../core/types';

let files: ToolFile[] = [];
let activeFileIndex = 0;
let currentRotation = 0;
let flipHorizontal = false;
let flipVertical = false;

export function createResizePage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'tool-layout view-enter';
  page.id = 'resize-page';

  page.innerHTML = `
    <aside class="left-sidebar">
      <div class="sidebar-upload-section">
        <button class="btn-upload" id="resize-upload-btn">
          ${ICONS.upload} Upload Images
        </button>
        <div class="sidebar-dropzone" id="resize-dropzone">
          <div class="sidebar-dropzone-icon">${ICONS.uploadPlus}</div>
          <div class="sidebar-dropzone-text">Drop images here</div>
          <div class="sidebar-dropzone-sub">PNG, JPG, WebP up to 50MB</div>
        </div>
        <input type="file" id="resize-file-input" accept="image/*" multiple style="display:none" />
      </div>
      <div class="sidebar-file-list" id="resize-file-list"></div>
    </aside>

    <div class="center-content">
      <div class="center-header">
        <div class="center-title">
          <h2 id="resize-main-title">Image Resizer</h2>
          <p id="resize-main-sub">Resize images by pixels, percentage, or social presets</p>
        </div>
        <div class="center-actions">
          <button class="btn-icon" id="resize-rot-left" title="Rotate Left 90°">${ICONS.rotateLeft}</button>
          <button class="btn-icon" id="resize-rot-right" title="Rotate Right 90°">${ICONS.rotateRight}</button>
          <button class="btn-icon" id="resize-fliph" title="Flip Horizontal">${ICONS.flipH}</button>
          <button class="btn-icon" id="resize-flipv" title="Flip Vertical">${ICONS.flipV}</button>
          <button class="btn btn-primary" id="resize-all-btn" disabled>
            ${ICONS.download} Resize & Save
          </button>
        </div>
      </div>

      <div class="preview-area" id="resize-preview-area">
        <div class="empty-state" id="resize-empty-state">
          ${ICONS.resize}
          <h3>No Image Selected</h3>
          <p>Upload an image from the left sidebar to preview and resize in real-time</p>
        </div>

        <div class="canvas-container checkerboard" id="resize-canvas-container" style="display:none; position:relative; max-width:100%; max-height:calc(100vh - 200px); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-lg);">
          <canvas id="resize-main-canvas"></canvas>
          <div id="resize-dim-badge" style="position:absolute; bottom:12px; right:12px; background:rgba(15,23,42,0.85); color:white; font-family:var(--font-mono); font-size:12px; padding:4px 10px; border-radius:6px; pointer-events:none;">
            1920 × 1080 px
          </div>
        </div>

        <div class="zoom-bar" id="resize-zoom-bar" style="display:none">
          <button id="resize-zoom-out" title="Zoom Out">${ICONS.zoomOut}</button>
          <span class="zoom-value" id="resize-zoom-value">100%</span>
          <button id="resize-zoom-in" title="Zoom In">${ICONS.zoomIn}</button>
          <button id="resize-zoom-fit" title="Fit to Screen">${ICONS.fit}</button>
        </div>
      </div>
    </div>

    <aside class="right-panel">
      <div class="right-panel-body">
        <!-- Resize Modes -->
        <div class="tool-section">
          <div class="tool-section-title">Resize Mode</div>
          <div class="compression-modes">
            <button class="compression-mode active" data-rmode="pixel" id="rmode-pixel">
              <span class="compression-mode-name">By Pixel</span>
              <span class="compression-mode-desc">Exact px</span>
            </button>
            <button class="compression-mode" data-rmode="percentage" id="rmode-percentage">
              <span class="compression-mode-name">By %</span>
              <span class="compression-mode-desc">Scale ratio</span>
            </button>
            <button class="compression-mode" data-rmode="preset" id="rmode-preset">
              <span class="compression-mode-name">Presets</span>
              <span class="compression-mode-desc">Standard & Social</span>
            </button>
          </div>
        </div>

        <!-- By Pixel Section -->
        <div class="tool-section" id="section-pixel">
          <div class="tool-section-title">Target Dimensions</div>
          <div class="dimension-inputs">
            <div>
              <label class="setting-label"><span class="label">Width (px)</span></label>
              <input type="number" class="input" id="input-width" value="1920" min="1" max="10000" />
            </div>
            <div class="dimension-lock" id="btn-aspect-lock" title="Maintain Aspect Ratio">
              ${ICONS.link}
            </div>
            <div>
              <label class="setting-label"><span class="label">Height (px)</span></label>
              <input type="number" class="input" id="input-height" value="1080" min="1" max="10000" />
            </div>
          </div>
        </div>

        <!-- By Percentage Section -->
        <div class="tool-section" id="section-percentage" style="display:none">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label">Scale Percentage</span>
              <span class="value" id="percent-display">100%</span>
            </div>
            <input type="range" class="slider" id="percent-slider" min="10" max="300" value="100" />
          </div>
        </div>

        <!-- Presets Section -->
        <div class="tool-section" id="section-preset" style="display:none">
          <div class="tool-section-title">Popular Sizes</div>
          <div class="radio-group" id="preset-list" style="max-height:220px; overflow-y:auto;">
            ${RESIZE_PRESETS.map((p, idx) => `
              <label class="radio-label ${idx === 1 ? 'selected' : ''}">
                <input type="radio" name="resize-preset-radio" value="${p.width}x${p.height}" ${idx === 1 ? 'checked' : ''} />
                <div class="radio-info">
                  <span class="radio-title">${p.name}</span>
                  <span class="radio-desc">${p.width} × ${p.height} px</span>
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Resampling Algorithm -->
        <div class="tool-section">
          <div class="tool-section-title">Resample Algorithm</div>
          <select class="select" id="select-resample">
            <option value="lanczos" selected>Lanczos (Sharpest & Best Quality)</option>
            <option value="bicubic">Bicubic (Smooth Interpolation)</option>
            <option value="bilinear">Bilinear (Fast)</option>
            <option value="nearest">Nearest Neighbor (Pixel Art)</option>
          </select>
        </div>

        <!-- Output Quality -->
        <div class="tool-section">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label">Output Quality</span>
              <span class="value" id="resize-quality-val">95%</span>
            </div>
            <input type="range" class="slider" id="resize-quality-slider" min="10" max="100" value="95" />
          </div>
        </div>

        <!-- Aspect Ratio Lock Toggle -->
        <div class="tool-section">
          <div class="setting-toggle-row">
            <span class="setting-toggle-label">Lock Aspect Ratio</span>
            <button class="toggle active" id="toggle-aspect"></button>
          </div>
        </div>
      </div>
    </aside>
  `;

  // File input setup
  setupUpload(page);

  // Mode buttons
  page.querySelectorAll('[data-rmode]').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('[data-rmode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = (btn as HTMLElement).dataset.rmode;
      page.querySelector('#section-pixel')!.setAttribute('style', mode === 'pixel' ? '' : 'display:none');
      page.querySelector('#section-percentage')!.setAttribute('style', mode === 'percentage' ? '' : 'display:none');
      page.querySelector('#section-preset')!.setAttribute('style', mode === 'preset' ? '' : 'display:none');
      updateLivePreview(page);
    });
  });

  // Aspect ratio lock toggle
  const aspectToggle = page.querySelector('#toggle-aspect');
  const aspectLockBtn = page.querySelector('#btn-aspect-lock') as HTMLElement;
  const toggleLock = () => {
    aspectToggle?.classList.toggle('active');
    const isLocked = aspectToggle?.classList.contains('active');
    if (aspectLockBtn) aspectLockBtn.style.color = isLocked ? 'var(--color-primary)' : 'var(--color-text-muted)';
  };
  aspectToggle?.addEventListener('click', toggleLock);
  aspectLockBtn?.addEventListener('click', toggleLock);

  // Dimension inputs live updating
  const widthInput = page.querySelector('#input-width') as HTMLInputElement;
  const heightInput = page.querySelector('#input-height') as HTMLInputElement;

  widthInput?.addEventListener('input', () => {
    if (aspectToggle?.classList.contains('active') && files[activeFileIndex]) {
      const f = files[activeFileIndex];
      const ratio = f.height / f.width;
      const w = parseInt(widthInput.value) || 1;
      heightInput.value = String(Math.round(w * ratio));
    }
    updateLivePreview(page);
  });

  heightInput?.addEventListener('input', () => {
    if (aspectToggle?.classList.contains('active') && files[activeFileIndex]) {
      const f = files[activeFileIndex];
      const ratio = f.width / f.height;
      const h = parseInt(heightInput.value) || 1;
      widthInput.value = String(Math.round(h * ratio));
    }
    updateLivePreview(page);
  });

  // Percentage slider
  const pSlider = page.querySelector('#percent-slider') as HTMLInputElement;
  pSlider?.addEventListener('input', () => {
    page.querySelector('#percent-display')!.textContent = `${pSlider.value}%`;
    if (files[activeFileIndex]) {
      const f = files[activeFileIndex];
      const pct = parseInt(pSlider.value) / 100;
      widthInput.value = String(Math.round(f.width * pct));
      heightInput.value = String(Math.round(f.height * pct));
    }
    updateLivePreview(page);
  });

  // Presets radio list
  page.querySelectorAll('input[name="resize-preset-radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      page.querySelectorAll('.radio-label').forEach(l => l.classList.remove('selected'));
      (radio as HTMLElement).closest('.radio-label')?.classList.add('selected');
      const val = (radio as HTMLInputElement).value;
      const [w, h] = val.split('x');
      widthInput.value = w;
      heightInput.value = h;
      updateLivePreview(page);
    });
  });

  // Quality slider
  const qSlider = page.querySelector('#resize-quality-slider') as HTMLInputElement;
  qSlider?.addEventListener('input', () => {
    page.querySelector('#resize-quality-val')!.textContent = `${qSlider.value}%`;
  });

  // Transformations
  page.querySelector('#resize-rot-left')?.addEventListener('click', () => {
    currentRotation = (currentRotation - 90) % 360;
    renderCanvasPreview(page);
  });
  page.querySelector('#resize-rot-right')?.addEventListener('click', () => {
    currentRotation = (currentRotation + 90) % 360;
    renderCanvasPreview(page);
  });
  page.querySelector('#resize-fliph')?.addEventListener('click', () => {
    flipHorizontal = !flipHorizontal;
    renderCanvasPreview(page);
  });
  page.querySelector('#resize-flipv')?.addEventListener('click', () => {
    flipVertical = !flipVertical;
    renderCanvasPreview(page);
  });

  // Resize All / Save button
  page.querySelector('#resize-all-btn')?.addEventListener('click', () => {
    processResizeSave(page);
  });

  return page;
}

function updateLivePreview(page: HTMLElement): void {
  const f = files[activeFileIndex];
  if (!f) return;
  const wInput = page.querySelector('#input-width') as HTMLInputElement;
  const hInput = page.querySelector('#input-height') as HTMLInputElement;
  const badge = page.querySelector('#resize-dim-badge');
  if (badge && wInput && hInput) {
    badge.textContent = `Target: ${wInput.value} × ${hInput.value} px`;
  }
}

function renderCanvasPreview(page: HTMLElement): void {
  const f = files[activeFileIndex];
  const emptyState = page.querySelector('#resize-empty-state') as HTMLElement;
  const container = page.querySelector('#resize-canvas-container') as HTMLElement;
  const zoomBar = page.querySelector('#resize-zoom-bar') as HTMLElement;
  const canvas = page.querySelector('#resize-main-canvas') as HTMLCanvasElement;
  const saveBtn = page.querySelector('#resize-all-btn') as HTMLButtonElement;

  if (!f) {
    if (emptyState) emptyState.style.display = 'flex';
    if (container) container.style.display = 'none';
    if (zoomBar) zoomBar.style.display = 'none';
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (container) container.style.display = 'inline-block';
  if (zoomBar) zoomBar.style.display = 'flex';
  if (saveBtn) saveBtn.disabled = false;

  const img = new Image();
  img.onload = () => {
    const isRotated = Math.abs(currentRotation % 180) === 90;
    canvas.width = isRotated ? img.naturalHeight : img.naturalWidth;
    canvas.height = isRotated ? img.naturalWidth : img.naturalHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((currentRotation * Math.PI) / 180);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = 'calc(100vh - 260px)';
    canvas.style.objectFit = 'contain';
  };
  img.src = f.thumbnail;

  updateLivePreview(page);
}

async function processResizeSave(page: HTMLElement): Promise<void> {
  const width = parseInt((page.querySelector('#input-width') as HTMLInputElement).value) || 1920;
  const height = parseInt((page.querySelector('#input-height') as HTMLInputElement).value) || 1080;
  const method = (page.querySelector('#select-resample') as HTMLSelectElement).value as ResampleMethod;
  const quality = parseInt((page.querySelector('#resize-quality-slider') as HTMLInputElement).value) / 100;

  for (const f of files) {
    f.status = 'processing';
    updateFileListUI(page);

    try {
      const blob = await resizeImage(f.file, width, height, method, quality);
      f.result = blob;
      f.resultSize = blob.size;
      f.status = 'done';

      // Auto download active item
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
      a.href = url;
      a.download = `${base}_${width}x${height}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      f.status = 'error';
    }
    updateFileListUI(page);
  }
}

function setupUpload(page: HTMLElement): void {
  const fileInput = page.querySelector('#resize-file-input') as HTMLInputElement;
  page.querySelector('#resize-upload-btn')?.addEventListener('click', () => fileInput.click());
  const dropzone = page.querySelector('#resize-dropzone')!;
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e: Event) => {
    e.preventDefault(); dropzone.classList.remove('drag-over');
    const de = e as DragEvent;
    if (de.dataTransfer?.files) addImages(Array.from(de.dataTransfer.files), page);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files) { addImages(Array.from(fileInput.files), page); fileInput.value = ''; }
  });
}

async function addImages(newFiles: File[], page: HTMLElement): Promise<void> {
  for (const file of newFiles) {
    if (!file.type.startsWith('image/')) continue;
    const dims = await loadDimensions(file);
    files.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      file, name: file.name, width: dims.w, height: dims.h, size: file.size,
      thumbnail: URL.createObjectURL(file), status: 'ready',
    });
  }

  if (files.length > 0) {
    activeFileIndex = 0;
    const active = files[0];
    (page.querySelector('#input-width') as HTMLInputElement).value = String(active.width);
    (page.querySelector('#input-height') as HTMLInputElement).value = String(active.height);
    renderCanvasPreview(page);
  }

  updateFileListUI(page);
}

function updateFileListUI(page: HTMLElement): void {
  const list = page.querySelector('#resize-file-list');
  if (!list) return;
  list.innerHTML = files.map((f, idx) => `
    <div class="file-item ${idx === activeFileIndex ? 'active' : ''}" data-idx="${idx}">
      <div class="file-thumb"><img src="${f.thumbnail}" alt="${f.name}" /></div>
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-meta">${f.width} × ${f.height} px · ${formatSize(f.size)}</div>
        <div class="file-status ${f.status === 'done' ? 'completed' : f.status === 'processing' ? 'processing' : 'ready'}">
          ${f.status === 'processing' ? '<span class="spinner" style="width:12px;height:12px;border-width:1.5px"></span>' : ''}
          ${f.status === 'done' ? `✓ Resized (${formatSize(f.resultSize || 0)})` : f.status === 'processing' ? 'Resizing...' : 'Ready'}
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      activeFileIndex = parseInt((item as HTMLElement).dataset.idx || '0');
      const active = files[activeFileIndex];
      if (active) {
        (page.querySelector('#input-width') as HTMLInputElement).value = String(active.width);
        (page.querySelector('#input-height') as HTMLInputElement).value = String(active.height);
      }
      updateFileListUI(page);
      renderCanvasPreview(page);
    });
  });
}

function loadDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 0, h: 0 }); };
    img.src = url;
  });
}

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export function cleanupResizePage(): void {
  files.forEach(f => { if (f.thumbnail) URL.revokeObjectURL(f.thumbnail); });
  files = [];
  currentRotation = 0;
  flipHorizontal = false;
  flipVertical = false;
}
