import { ICONS } from './icons';
import type { ImageFormat, ToolFile } from '../core/types';

let files: ToolFile[] = [];
let activeIndex = 0;

export function createConverter(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'tool-layout view-enter';
  page.id = 'converter-page';

  page.innerHTML = `
    <aside class="left-sidebar">
      <div class="sidebar-upload-section">
        <button class="btn-upload" id="convert-upload-btn">
          ${ICONS.upload} Upload Images
        </button>
        <div class="sidebar-dropzone" id="convert-dropzone">
          <div class="sidebar-dropzone-icon">${ICONS.uploadPlus}</div>
          <div class="sidebar-dropzone-text">Drop images here</div>
          <div class="sidebar-dropzone-sub">PNG, JPG, WebP, GIF</div>
        </div>
        <input type="file" id="convert-file-input" accept="image/*" multiple style="display:none" />
      </div>
      <div class="sidebar-file-list" id="convert-file-list"></div>
    </aside>

    <div class="center-content">
      <div class="center-header">
        <div class="center-title">
          <h2>Format Converter</h2>
          <p>Convert images between WebP, PNG, JPEG, and GIF formats with full quality control</p>
        </div>
        <div class="center-actions">
          <button class="btn btn-primary" id="convert-all-btn" disabled>
            ${ICONS.convert} Convert & Download
          </button>
        </div>
      </div>

      <div class="preview-area" id="convert-preview-area">
        <div class="empty-state" id="convert-empty-state">
          ${ICONS.convert}
          <h3>No Image Selected</h3>
          <p>Upload an image from the sidebar to preview and convert formats</p>
        </div>

        <div class="canvas-container checkerboard" id="convert-canvas-container" style="display:none; position:relative; max-width:100%; max-height:calc(100vh - 220px); border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-lg);">
          <canvas id="convert-main-canvas"></canvas>
          <div id="convert-format-badge" style="position:absolute; bottom:12px; right:12px; background:rgba(15,23,42,0.85); color:white; font-family:var(--font-mono); font-size:12px; padding:4px 10px; border-radius:6px;">
            Target: WEBP (90% Quality)
          </div>
        </div>
      </div>
    </div>

    <aside class="right-panel">
      <div class="right-panel-body">
        <div class="tool-section">
          <div class="tool-section-title">Target Format</div>
          <div class="format-selector">
            <button class="format-btn active" data-conv-format="webp">WebP</button>
            <button class="format-btn" data-conv-format="png">PNG</button>
            <button class="format-btn" data-conv-format="jpeg">JPG</button>
            <button class="format-btn" data-conv-format="gif">GIF</button>
          </div>
        </div>

        <div class="tool-section">
          <div class="setting-row">
            <div class="setting-label">
              <span class="label">Quality</span>
              <span class="value" id="conv-quality-val">90%</span>
            </div>
            <input type="range" class="slider" id="conv-quality-slider" min="10" max="100" value="90" />
          </div>
        </div>

        <div class="tool-section" id="conv-bg-section">
          <div class="tool-section-title">Background Fill (for JPEG)</div>
          <div class="format-selector" style="grid-template-columns: repeat(4, 1fr);">
            <button class="format-btn active" data-conv-bg="#ffffff">White</button>
            <button class="format-btn" data-conv-bg="#000000">Black</button>
            <button class="format-btn" data-conv-bg="#f8fafc">Light</button>
            <button class="format-btn" data-conv-bg="#0f172a">Dark</button>
          </div>
        </div>

        <div class="guide-card">
          <div class="guide-card-title">${ICONS.info} Format Guide</div>
          <div class="guide-item">
            <div class="guide-item-icon">W</div>
            <div class="guide-item-text">
              <span class="guide-item-name">WebP</span>
              <span class="guide-item-desc">Recommended for modern web with superior compression</span>
            </div>
          </div>
          <div class="guide-item">
            <div class="guide-item-icon">P</div>
            <div class="guide-item-text">
              <span class="guide-item-name">PNG</span>
              <span class="guide-item-desc">Lossless with full alpha transparency support</span>
            </div>
          </div>
          <div class="guide-item">
            <div class="guide-item-icon">J</div>
            <div class="guide-item-text">
              <span class="guide-item-name">JPEG</span>
              <span class="guide-item-desc">Universal compatibility for photography & social media</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  `;

  // Setup upload
  setupUpload(page);

  // Format selector
  page.querySelectorAll('[data-conv-format]').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('[data-conv-format]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const fmt = (btn as HTMLElement).dataset.convFormat;
      updateBadge(page);
      renderConvertPreview(page);
    });
  });

  // Background color
  page.querySelectorAll('[data-conv-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('[data-conv-bg]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderConvertPreview(page);
    });
  });

  // Quality slider
  const qSlider = page.querySelector('#conv-quality-slider') as HTMLInputElement;
  qSlider?.addEventListener('input', () => {
    page.querySelector('#conv-quality-val')!.textContent = `${qSlider.value}%`;
    updateBadge(page);
  });

  // Convert All
  page.querySelector('#convert-all-btn')?.addEventListener('click', () => {
    processConvertDownload(page);
  });

  return page;
}

function updateBadge(page: HTMLElement): void {
  const fmt = (page.querySelector('[data-conv-format].active') as HTMLElement)?.dataset.convFormat || 'webp';
  const q = (page.querySelector('#conv-quality-slider') as HTMLInputElement)?.value || '90';
  const badge = page.querySelector('#convert-format-badge');
  if (badge) badge.textContent = `Target: ${fmt.toUpperCase()} (${q}% Quality)`;
}

function renderConvertPreview(page: HTMLElement): void {
  const f = files[activeIndex];
  const emptyState = page.querySelector('#convert-empty-state') as HTMLElement;
  const container = page.querySelector('#convert-canvas-container') as HTMLElement;
  const canvas = page.querySelector('#convert-main-canvas') as HTMLCanvasElement;
  const saveBtn = page.querySelector('#convert-all-btn') as HTMLButtonElement;

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

    const format = (page.querySelector('[data-conv-format].active') as HTMLElement)?.dataset.convFormat;
    const bgColor = (page.querySelector('[data-conv-bg].active') as HTMLElement)?.dataset.convBg || '#ffffff';

    if (format === 'jpeg') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = 'calc(100vh - 240px)';
    canvas.style.objectFit = 'contain';
  };
  img.src = f.thumbnail;

  updateBadge(page);
}

async function processConvertDownload(page: HTMLElement): Promise<void> {
  const format = (page.querySelector('[data-conv-format].active') as HTMLElement)?.dataset.convFormat as ImageFormat || 'webp';
  const quality = parseInt((page.querySelector('#conv-quality-slider') as HTMLInputElement).value) / 100;
  const bgColor = (page.querySelector('[data-conv-bg].active') as HTMLElement)?.dataset.convBg || '#ffffff';

  for (const f of files) {
    f.status = 'processing';
    updateFileListUI(page);

    try {
      const blob = await convertImageFile(f.file, format, quality, bgColor);
      f.result = blob;
      f.resultSize = blob.size;
      f.status = 'done';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'jpeg' ? 'jpg' : format;
      const base = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
      a.href = url;
      a.download = `${base}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      f.status = 'error';
    }
    updateFileListUI(page);
  }
}

async function convertImageFile(file: File, format: ImageFormat, quality: number, bgColor: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      if (format === 'jpeg') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : format === 'gif' ? 'image/gif' : 'image/png';

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Conversion failed')),
        mime,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function setupUpload(page: HTMLElement): void {
  const fileInput = page.querySelector('#convert-file-input') as HTMLInputElement;
  page.querySelector('#convert-upload-btn')?.addEventListener('click', () => fileInput.click());
  const dropzone = page.querySelector('#convert-dropzone')!;
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
    renderConvertPreview(page);
  }

  updateFileListUI(page);
}

function updateFileListUI(page: HTMLElement): void {
  const list = page.querySelector('#convert-file-list');
  if (!list) return;
  list.innerHTML = files.map((f, idx) => `
    <div class="file-item ${idx === activeIndex ? 'active' : ''}" data-idx="${idx}">
      <div class="file-thumb"><img src="${f.thumbnail}" alt="${f.name}" /></div>
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-meta">${f.width} × ${f.height} px · ${formatSize(f.size)}</div>
        <div class="file-status ${f.status === 'done' ? 'completed' : f.status === 'processing' ? 'processing' : 'ready'}">
          ${f.status === 'processing' ? '<span class="spinner" style="width:12px;height:12px;border-width:1.5px"></span> Converting...' : f.status === 'done' ? `✓ Converted (${formatSize(f.resultSize || 0)})` : 'Ready'}
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      activeIndex = parseInt((item as HTMLElement).dataset.idx || '0');
      updateFileListUI(page);
      renderConvertPreview(page);
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

export function cleanupConverter(): void {
  files.forEach(f => { if (f.thumbnail) URL.revokeObjectURL(f.thumbnail); });
  files = [];
}
