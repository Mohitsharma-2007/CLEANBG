import { ICONS } from './icons';
import { upscaleImage } from '../tools/enhancer';
import type { ToolFile } from '../core/types';

let files: ToolFile[] = [];
let activeIndex = 0;
let isComparing = false;
let splitPct = 50;
let originalImageData: ImageData | null = null;
let enhancedImageData: ImageData | null = null;

export function createUpscalePage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'tool-layout view-enter';
  page.id = 'upscale-page';

  page.innerHTML = `
    <aside class="left-sidebar">
      <div class="sidebar-upload-section">
        <button class="btn-upload" id="upscale-upload-btn">
          ${ICONS.upload} Upload Images
        </button>
        <div class="sidebar-dropzone" id="upscale-dropzone">
          <div class="sidebar-dropzone-icon">${ICONS.uploadPlus}</div>
          <div class="sidebar-dropzone-text">Drop images here</div>
          <div class="sidebar-dropzone-sub">PNG, JPG, WebP</div>
        </div>
        <input type="file" id="upscale-file-input" accept="image/*" multiple style="display:none" />
      </div>
      <div class="sidebar-file-list" id="upscale-file-list"></div>
    </aside>

    <div class="center-content">
      <div class="center-header">
        <div class="center-title">
          <h2>AI Upscale & Super-Resolution</h2>
          <p>Increase image resolution up to 8x with detail recovery and sharpening</p>
        </div>
        <div class="center-actions">
          <div class="toggle-tabs">
            <button class="toggle-tab active" id="btn-upscale-split">${ICONS.compare} Split Comparison</button>
            <button class="toggle-tab" id="btn-upscale-enhanced">Enhanced Only</button>
          </div>
          <button class="btn btn-primary" id="upscale-all-btn" disabled>
            ${ICONS.download} Enhance & Save
          </button>
        </div>
      </div>

      <div class="preview-area" id="upscale-preview-area">
        <div class="empty-state" id="upscale-empty-state">
          ${ICONS.upscale}
          <h3>No Image Selected</h3>
          <p>Upload an image from the sidebar to preview real-time AI upscaling</p>
        </div>

        <div class="canvas-container checkerboard" id="upscale-canvas-container" style="display:none; position:relative; max-width:100%; max-height:calc(100vh - 200px); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-lg);">
          <canvas id="upscale-main-canvas"></canvas>
          <canvas id="upscale-overlay-canvas" style="position:absolute; top:0; left:0; pointer-events:none;"></canvas>

          <!-- Split comparison divider -->
          <div id="upscale-split-divider" style="position:absolute; top:0; bottom:0; width:3px; background:#ffffff; box-shadow:0 0 8px rgba(0,0,0,0.5); cursor:ew-resize; z-index:10; left:50%;">
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:32px; height:32px; border-radius:50%; background:#ffffff; box-shadow:var(--shadow-md); border:2px solid var(--color-primary); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--color-primary); user-select:none;">
              ◀ ▶
            </div>
            <div style="position:absolute; top:12px; left:-65px; background:rgba(0,0,0,0.65); color:white; font-size:11px; padding:2px 8px; border-radius:4px; pointer-events:none; font-weight:500;">Original</div>
            <div style="position:absolute; top:12px; right:-75px; background:var(--color-primary); color:white; font-size:11px; padding:2px 8px; border-radius:4px; pointer-events:none; font-weight:500;">Enhanced</div>
          </div>
        </div>
      </div>
    </div>

    <aside class="right-panel">
      <div class="right-panel-body">
        <div class="tool-section">
          <div class="tool-section-title">Upscale Factor</div>
          <div class="scale-selector">
            <button class="scale-option" data-upscale="2">
              <span class="scale-option-value">2x</span>
              <span class="scale-option-dim">HD</span>
            </button>
            <button class="scale-option active" data-upscale="4">
              <span class="scale-option-value">4x</span>
              <span class="scale-option-dim">Ultra 4K</span>
            </button>
            <button class="scale-option" data-upscale="6">
              <span class="scale-option-value">6x</span>
              <span class="scale-option-dim">6K Res</span>
            </button>
            <button class="scale-option" data-upscale="8">
              <span class="scale-option-value">8x</span>
              <span class="scale-option-dim">Print 8K</span>
            </button>
          </div>
        </div>

        <div class="tool-section">
          <div class="tool-section-title">Detail & Clarity Tuning</div>
          <div class="setting-row">
            <div class="setting-label">
              <span class="label">Smart Sharpening</span>
              <span class="value" id="val-sharpness">50%</span>
            </div>
            <input type="range" class="slider" id="slider-sharpness" min="0" max="100" value="50" />
          </div>
          <div class="setting-row" style="margin-top:12px">
            <div class="setting-label">
              <span class="label">Noise Smoothing</span>
              <span class="value" id="val-noise">30%</span>
            </div>
            <input type="range" class="slider" id="slider-noise" min="0" max="100" value="30" />
          </div>
          <div class="setting-row" style="margin-top:12px">
            <div class="setting-label">
              <span class="label">Texture Recovery (CLAHE)</span>
              <span class="value" id="val-detail">65%</span>
            </div>
            <input type="range" class="slider" id="slider-detail" min="0" max="100" value="65" />
          </div>
        </div>

        <div class="security-badge" style="margin-top:16px">
          ${ICONS.shield}
          <div class="security-badge-text">
            <span class="security-badge-title">Local Canvas Acceleration</span>
            <span class="security-badge-desc">Zero cloud uploads · 100% private in browser</span>
          </div>
        </div>
      </div>
    </aside>
  `;

  // Setup upload
  setupUpload(page);

  // Scale buttons
  page.querySelectorAll('[data-upscale]').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('[data-upscale]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEnhancedPreview(page);
    });
  });

  // Slider adjustments with live preview update
  setupSlider(page, 'slider-sharpness', 'val-sharpness', '%', () => renderEnhancedPreview(page));
  setupSlider(page, 'slider-noise', 'val-noise', '%', () => renderEnhancedPreview(page));
  setupSlider(page, 'slider-detail', 'val-detail', '%', () => renderEnhancedPreview(page));

  // Split view slider dragging
  setupSplitSlider(page);

  // View toggle
  page.querySelector('#btn-upscale-split')?.addEventListener('click', (e) => {
    page.querySelectorAll('.toggle-tab').forEach(t => t.classList.remove('active'));
    (e.currentTarget as HTMLElement).classList.add('active');
    isComparing = false;
    const divider = page.querySelector('#upscale-split-divider') as HTMLElement;
    if (divider) divider.style.display = 'block';
    renderSplitOverlay(page);
  });

  page.querySelector('#btn-upscale-enhanced')?.addEventListener('click', (e) => {
    page.querySelectorAll('.toggle-tab').forEach(t => t.classList.remove('active'));
    (e.currentTarget as HTMLElement).classList.add('active');
    isComparing = true;
    const divider = page.querySelector('#upscale-split-divider') as HTMLElement;
    const overlay = page.querySelector('#upscale-overlay-canvas') as HTMLElement;
    if (divider) divider.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
  });

  // Save / Enhance button
  page.querySelector('#upscale-all-btn')?.addEventListener('click', () => {
    processUpscaleDownload(page);
  });

  return page;
}

function setupSlider(page: HTMLElement, id: string, valId: string, unit: string, cb: () => void): void {
  const s = page.querySelector(`#${id}`) as HTMLInputElement;
  s?.addEventListener('input', () => {
    page.querySelector(`#${valId}`)!.textContent = `${s.value}${unit}`;
    cb();
  });
}

function setupSplitSlider(page: HTMLElement): void {
  const container = page.querySelector('#upscale-canvas-container') as HTMLElement;
  const divider = page.querySelector('#upscale-split-divider') as HTMLElement;
  let isDragging = false;

  if (!container || !divider) return;

  const onMove = (clientX: number) => {
    if (!isDragging) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    splitPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    divider.style.left = `${splitPct}%`;
    renderSplitOverlay(page);
  };

  divider.addEventListener('mousedown', (e) => { e.preventDefault(); isDragging = true; });
  window.addEventListener('mousemove', (e) => { if (isDragging) onMove(e.clientX); });
  window.addEventListener('mouseup', () => { isDragging = false; });
}

function renderEnhancedPreview(page: HTMLElement): void {
  const f = files[activeIndex];
  const emptyState = page.querySelector('#upscale-empty-state') as HTMLElement;
  const container = page.querySelector('#upscale-canvas-container') as HTMLElement;
  const canvas = page.querySelector('#upscale-main-canvas') as HTMLCanvasElement;
  const saveBtn = page.querySelector('#upscale-all-btn') as HTMLButtonElement;

  if (!f) {
    if (emptyState) emptyState.style.display = 'flex';
    if (container) container.style.display = 'none';
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (container) container.style.display = 'inline-block';
  if (saveBtn) saveBtn.disabled = false;

  const img = new Image();
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply enhancement
    const sharpness = parseInt((page.querySelector('#slider-sharpness') as HTMLInputElement).value);
    const noise = parseInt((page.querySelector('#slider-noise') as HTMLInputElement).value);
    const detail = parseInt((page.querySelector('#slider-detail') as HTMLInputElement).value);

    // Live preview enhancement directly on canvas
    applyCanvasFilters(canvas, sharpness, noise, detail);
    enhancedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = 'calc(100vh - 240px)';
    canvas.style.objectFit = 'contain';

    renderSplitOverlay(page);
  };
  img.src = f.thumbnail;
}

function applyCanvasFilters(canvas: HTMLCanvasElement, sharpness: number, noise: number, detail: number): void {
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const contrastFactor = 1 + (detail / 200);

  for (let i = 0; i < data.length; i += 4) {
    // Contrast pop
    data[i] = Math.min(255, Math.max(0, 128 + (data[i] - 128) * contrastFactor));
    data[i + 1] = Math.min(255, Math.max(0, 128 + (data[i + 1] - 128) * contrastFactor));
    data[i + 2] = Math.min(255, Math.max(0, 128 + (data[i + 2] - 128) * contrastFactor));
  }
  ctx.putImageData(imgData, 0, 0);
}

function renderSplitOverlay(page: HTMLElement): void {
  if (isComparing || !originalImageData) return;
  const overlay = page.querySelector('#upscale-overlay-canvas') as HTMLCanvasElement;
  const mainCanvas = page.querySelector('#upscale-main-canvas') as HTMLCanvasElement;
  if (!overlay || !mainCanvas) return;

  overlay.style.display = 'block';
  overlay.width = mainCanvas.width;
  overlay.height = mainCanvas.height;
  overlay.style.width = `${mainCanvas.clientWidth}px`;
  overlay.style.height = `${mainCanvas.clientHeight}px`;

  const octx = overlay.getContext('2d')!;
  const splitX = Math.round((splitPct / 100) * overlay.width);

  octx.clearRect(0, 0, overlay.width, overlay.height);
  octx.save();
  octx.beginPath();
  octx.rect(0, 0, splitX, overlay.height);
  octx.clip();
  octx.putImageData(originalImageData, 0, 0);
  octx.restore();
}

async function processUpscaleDownload(page: HTMLElement): Promise<void> {
  const scale = parseFloat((page.querySelector('[data-upscale].active') as HTMLElement)?.dataset.upscale || '4');
  const sharpness = parseInt((page.querySelector('#slider-sharpness') as HTMLInputElement).value);
  const noiseReduction = parseInt((page.querySelector('#slider-noise') as HTMLInputElement).value);
  const recoverDetails = parseInt((page.querySelector('#slider-detail') as HTMLInputElement).value);

  for (const f of files) {
    f.status = 'processing';
    updateFileListUI(page);

    try {
      const blob = await upscaleImage(f.file, scale, { sharpness, noiseReduction, recoverDetails });
      f.result = blob;
      f.resultSize = blob.size;
      f.status = 'done';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
      a.href = url;
      a.download = `${base}_${scale}x_enhanced.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      f.status = 'error';
    }
    updateFileListUI(page);
  }
}

function setupUpload(page: HTMLElement): void {
  const fileInput = page.querySelector('#upscale-file-input') as HTMLInputElement;
  page.querySelector('#upscale-upload-btn')?.addEventListener('click', () => fileInput.click());
  const dropzone = page.querySelector('#upscale-dropzone')!;
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
    activeIndex = 0;
    renderEnhancedPreview(page);
  }

  updateFileListUI(page);
}

function updateFileListUI(page: HTMLElement): void {
  const list = page.querySelector('#upscale-file-list');
  if (!list) return;
  list.innerHTML = files.map((f, idx) => `
    <div class="file-item ${idx === activeIndex ? 'active' : ''}" data-idx="${idx}">
      <div class="file-thumb"><img src="${f.thumbnail}" alt="${f.name}" /></div>
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-meta">${f.width} × ${f.height} px · ${formatSize(f.size)}</div>
        <div class="file-status ${f.status === 'done' ? 'completed' : f.status === 'processing' ? 'processing' : 'ready'}">
          ${f.status === 'processing' ? '<span class="spinner" style="width:12px;height:12px;border-width:1.5px"></span>' : ''}
          ${f.status === 'done' ? `✓ Enhanced (${formatSize(f.resultSize || 0)})` : f.status === 'processing' ? 'Enhancing...' : 'Ready'}
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      activeIndex = parseInt((item as HTMLElement).dataset.idx || '0');
      updateFileListUI(page);
      renderEnhancedPreview(page);
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

export function cleanupUpscalePage(): void {
  files.forEach(f => { if (f.thumbnail) URL.revokeObjectURL(f.thumbnail); });
  files = [];
  originalImageData = null;
  enhancedImageData = null;
}
