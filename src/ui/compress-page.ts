import { ICONS } from './icons';
import { compressImage } from '../tools/compressor';
import type { CompressionMode, ToolFile } from '../core/types';

let files: ToolFile[] = [];
let activeIndex = 0;

export function createCompressPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'tool-layout view-enter';
  page.id = 'compress-page';

  page.innerHTML = `
    <aside class="left-sidebar">
      <div class="sidebar-upload-section">
        <button class="btn-upload" id="compress-upload-btn">
          ${ICONS.upload} Upload Images
        </button>
        <div class="sidebar-dropzone" id="compress-dropzone">
          <div class="sidebar-dropzone-icon">${ICONS.uploadPlus}</div>
          <div class="sidebar-dropzone-text">Drop images here</div>
          <div class="sidebar-dropzone-sub">PNG, JPG, WebP</div>
        </div>
        <input type="file" id="compress-file-input" accept="image/*" multiple style="display:none" />
      </div>
      <div class="sidebar-file-list" id="compress-file-list"></div>
    </aside>

    <div class="center-content">
      <div class="center-header">
        <div class="center-title">
          <h2>Image Compressor</h2>
          <p>Compress image file sizes by up to 90% without visible quality loss</p>
        </div>
        <div class="center-actions">
          <button class="btn btn-primary" id="compress-all-btn" disabled>
            ${ICONS.download} Compress & Save All
          </button>
        </div>
      </div>

      <div class="preview-area" id="compress-preview-area">
        <div class="empty-state" id="compress-empty-state">
          ${ICONS.compress}
          <h3>No Image Selected</h3>
          <p>Upload an image to inspect compression quality and live file size savings</p>
        </div>

        <div class="canvas-container checkerboard" id="compress-canvas-container" style="display:none; position:relative; max-width:100%; max-height:calc(100vh - 220px); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-lg);">
          <canvas id="compress-main-canvas"></canvas>
          <div id="compress-live-badge" style="position:absolute; bottom:14px; left:14px; right:14px; background:rgba(15,23,42,0.88); backdrop-filter:blur(8px); color:white; padding:10px 16px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; font-size:13px;">
            <div>
              <span style="color:#94a3b8">Original:</span> <strong id="badge-orig-size">0 KB</strong>
              <span style="margin:0 8px; color:#64748b">→</span>
              <span style="color:#94a3b8">Estimated:</span> <strong id="badge-comp-size" style="color:#38bdf8">0 KB</strong>
            </div>
            <div id="badge-savings" style="background:#10b981; color:white; font-weight:700; font-size:12px; padding:2px 8px; border-radius:4px;">
              -60% Saved
            </div>
          </div>
        </div>
      </div>
    </div>

    <aside class="right-panel">
      <div class="right-panel-body">
        <!-- Compression Preset Modes -->
        <div class="tool-section">
          <div class="tool-section-title">Compression Profile</div>
          <div class="compression-modes">
            <button class="compression-mode" data-cmode="smallest" title="Max storage reduction">
              <span class="compression-mode-name">Smallest</span>
              <span class="compression-mode-desc">Max Size Reduction</span>
            </button>
            <button class="compression-mode active" data-cmode="balanced" title="Optimal for Web & Mobile">
              <span class="compression-mode-name">Balanced</span>
              <span class="compression-mode-desc">Best Quality/Size</span>
            </button>
            <button class="compression-mode" data-cmode="quality" title="Lossless visual fidelity">
              <span class="compression-mode-name">Quality</span>
              <span class="compression-mode-desc">Ultra Crisp</span>
            </button>
          </div>
        </div>

        <!-- Quality Slider -->
        <div class="tool-section">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label">Quality Factor</span>
              <span class="value" id="val-compress-quality">80%</span>
            </div>
            <input type="range" class="slider" id="slider-compress-quality" min="10" max="100" value="80" />
          </div>
        </div>

        <!-- Target Format -->
        <div class="tool-section">
          <div class="tool-section-title">Target Format</div>
          <div class="format-selector">
            <button class="format-btn active" data-comp-fmt="auto">Auto (Best)</button>
            <button class="format-btn" data-comp-fmt="webp">WebP</button>
            <button class="format-btn" data-comp-fmt="jpeg">JPEG</button>
            <button class="format-btn" data-comp-fmt="png">PNG</button>
          </div>
        </div>

        <!-- Advanced Switches -->
        <div class="tool-section">
          <div class="setting-toggle-row">
            <span class="setting-toggle-label">Strip EXIF / Metadata</span>
            <button class="toggle active" id="toggle-strip-meta"></button>
          </div>
          <div class="setting-toggle-row">
            <span class="setting-toggle-label">Progressive Web Encoding</span>
            <button class="toggle active" id="toggle-progressive"></button>
          </div>
        </div>

        <!-- Tips Info Card -->
        <div class="tips-card">
          <div class="tips-card-title">${ICONS.info} Pro Tip</div>
          <ul>
            <li>WebP format produces ~30% smaller files than JPEG at equal visual fidelity.</li>
            <li>Stripping EXIF camera headers reduces extra KB and preserves privacy.</li>
          </ul>
        </div>
      </div>
    </aside>
  `;

  // Setup upload
  setupUpload(page);

  // Mode switching
  page.querySelectorAll('[data-cmode]').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('[data-cmode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = (btn as HTMLElement).dataset.cmode;
      const qSlider = page.querySelector('#slider-compress-quality') as HTMLInputElement;
      if (mode === 'smallest') qSlider.value = '50';
      else if (mode === 'balanced') qSlider.value = '80';
      else if (mode === 'quality') qSlider.value = '92';
      page.querySelector('#val-compress-quality')!.textContent = `${qSlider.value}%`;
      updateLiveEstimation(page);
    });
  });

  // Quality slider
  const qSlider = page.querySelector('#slider-compress-quality') as HTMLInputElement;
  qSlider?.addEventListener('input', () => {
    page.querySelector('#val-compress-quality')!.textContent = `${qSlider.value}%`;
    updateLiveEstimation(page);
  });

  // Format buttons
  page.querySelectorAll('[data-comp-fmt]').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('[data-comp-fmt]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateLiveEstimation(page);
    });
  });

  // Toggles
  page.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => t.classList.toggle('active'));
  });

  // Compress All
  page.querySelector('#compress-all-btn')?.addEventListener('click', () => {
    processCompressDownload(page);
  });

  return page;
}

function updateLiveEstimation(page: HTMLElement): void {
  const f = files[activeIndex];
  if (!f) return;

  const q = parseInt((page.querySelector('#slider-compress-quality') as HTMLInputElement).value) / 100;
  const origSize = f.size;
  const estimatedSize = Math.round(origSize * (0.2 + q * 0.45));
  const savingsPct = Math.max(5, Math.round(((origSize - estimatedSize) / origSize) * 100));

  const origBadge = page.querySelector('#badge-orig-size');
  const compBadge = page.querySelector('#badge-comp-size');
  const savBadge = page.querySelector('#badge-savings');

  if (origBadge) origBadge.textContent = formatSize(origSize);
  if (compBadge) compBadge.textContent = formatSize(estimatedSize);
  if (savBadge) savBadge.textContent = `-${savingsPct}% Saved`;
}

function renderCompressPreview(page: HTMLElement): void {
  const f = files[activeIndex];
  const emptyState = page.querySelector('#compress-empty-state') as HTMLElement;
  const container = page.querySelector('#compress-canvas-container') as HTMLElement;
  const canvas = page.querySelector('#compress-main-canvas') as HTMLCanvasElement;
  const saveBtn = page.querySelector('#compress-all-btn') as HTMLButtonElement;

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

    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = 'calc(100vh - 240px)';
    canvas.style.objectFit = 'contain';
  };
  img.src = f.thumbnail;

  updateLiveEstimation(page);
}

async function processCompressDownload(page: HTMLElement): Promise<void> {
  const mode = (page.querySelector('[data-cmode].active') as HTMLElement)?.dataset.cmode as CompressionMode || 'balanced';
  const quality = parseInt((page.querySelector('#slider-compress-quality') as HTMLInputElement).value);
  const format = (page.querySelector('[data-comp-fmt].active') as HTMLElement)?.dataset.compFmt || 'auto';
  const removeMeta = page.querySelector('#toggle-strip-meta')?.classList.contains('active') ?? true;

  for (const f of files) {
    f.status = 'processing';
    updateFileListUI(page);

    try {
      const { blob, savings } = await compressImage(f.file, mode, quality, format, removeMeta);
      f.result = blob;
      f.resultSize = blob.size;
      f.savings = savings;
      f.status = 'done';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'auto' ? 'webp' : format;
      const base = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
      a.href = url;
      a.download = `${base}_compressed.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      f.status = 'error';
    }
    updateFileListUI(page);
  }
}

function setupUpload(page: HTMLElement): void {
  const fileInput = page.querySelector('#compress-file-input') as HTMLInputElement;
  page.querySelector('#compress-upload-btn')?.addEventListener('click', () => fileInput.click());
  const dropzone = page.querySelector('#compress-dropzone')!;
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
    renderCompressPreview(page);
  }

  updateFileListUI(page);
}

function updateFileListUI(page: HTMLElement): void {
  const list = page.querySelector('#compress-file-list');
  if (!list) return;
  list.innerHTML = files.map((f, idx) => `
    <div class="file-item ${idx === activeIndex ? 'active' : ''}" data-idx="${idx}">
      <div class="file-thumb"><img src="${f.thumbnail}" alt="${f.name}" /></div>
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-meta">${formatSize(f.size)}</div>
        <div class="file-status ${f.status === 'done' ? 'completed' : f.status === 'processing' ? 'processing' : 'ready'}">
          ${f.status === 'processing' ? '<span class="spinner" style="width:12px;height:12px;border-width:1.5px"></span> Compressing...' : f.status === 'done' ? `✓ Saved ${Math.round(((f.savings || 0) / f.size) * 100)}%` : 'Ready'}
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      activeIndex = parseInt((item as HTMLElement).dataset.idx || '0');
      updateFileListUI(page);
      renderCompressPreview(page);
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

export function cleanupCompressPage(): void {
  files.forEach(f => { if (f.thumbnail) URL.revokeObjectURL(f.thumbnail); });
  files = [];
}
