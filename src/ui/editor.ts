import { ICONS } from './icons';
import { eventBus } from '../core/event-bus';
import { state } from '../core/state';

export type ViewMode = 'split' | 'result' | 'original';

export function createEditor(): HTMLElement {
  const editor = document.createElement('div');
  editor.className = 'center-content';
  editor.id = 'center-content';

  editor.innerHTML = `
    <div class="center-header" id="editor-header">
      <div class="center-title">
        <h2 id="editor-title">Remove Background</h2>
        <p id="editor-subtitle">Upload an image to get started</p>
      </div>
      <div class="center-actions">
        <!-- View mode tabs -->
        <div class="toggle-tabs" id="view-mode-tabs">
          <button class="toggle-tab active" data-vmode="split" id="vmode-split" title="Interactive Split Comparison Slider">
            ${ICONS.compare} Split View
          </button>
          <button class="toggle-tab" data-vmode="result" id="vmode-result" title="Processed Result Cutout">
            Cutout
          </button>
          <button class="toggle-tab" data-vmode="original" id="vmode-original" title="Original Image">
            Original
          </button>
        </div>

        <!-- Quick Transform Buttons -->
        <div class="tool-buttons" style="gap:4px">
          <button class="btn-icon" id="btn-rotate-left" title="Rotate Left 90°">${ICONS.rotateLeft}</button>
          <button class="btn-icon" id="btn-rotate-right" title="Rotate Right 90°">${ICONS.rotateRight}</button>
          <button class="btn-icon" id="btn-flip-h" title="Flip Horizontal">${ICONS.flipH}</button>
          <button class="btn-icon" id="btn-flip-v" title="Flip Vertical">${ICONS.flipV}</button>
        </div>

        <button class="export-btn" id="export-btn" disabled>
          ${ICONS.download} Export
        </button>
      </div>
    </div>

    <div class="preview-area" id="preview-area" style="position:relative; overflow:hidden;">
      <div class="empty-state" id="empty-state">
        <div class="illustration" style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.1)); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--color-primary);">
           ${ICONS.uploadPlus}
        </div>
        <h3>No Image Selected</h3>
        <p>Upload an image from the sidebar or drag & drop to begin editing</p>
      </div>

      <div class="preview-canvas-wrapper" id="preview-canvas-wrapper" style="display:none; position:relative; max-width:100%; max-height:100%; align-items:center; justify-content:center;">
        <!-- Canvas Container with Checkerboard -->
        <div class="canvas-container checkerboard" id="canvas-container" style="position:relative; display:inline-block; border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-lg); user-select:none;">
          <canvas id="main-canvas" style="display:block;"></canvas>
          
          <!-- Split comparison divider line & handle -->
          <div id="split-divider" style="position:absolute; top:0; bottom:0; width:3px; background:#ffffff; box-shadow:0 0 10px rgba(0,0,0,0.6); cursor:ew-resize; z-index:15; left:50%; display:none; pointer-events:auto;">
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:34px; height:34px; border-radius:50%; background:#ffffff; box-shadow:var(--shadow-lg); border:2px solid var(--color-primary); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:var(--color-primary); user-select:none; cursor:ew-resize;">
              ◀ ▶
            </div>
            <div style="position:absolute; top:14px; right:12px; background:rgba(0,0,0,0.7); color:white; font-size:11px; padding:3px 8px; border-radius:4px; pointer-events:none; font-weight:600; white-space:nowrap;">
              Original
            </div>
            <div style="position:absolute; top:14px; left:12px; background:var(--color-primary); color:white; font-size:11px; padding:3px 8px; border-radius:4px; pointer-events:none; font-weight:600; white-space:nowrap;">
              Cutout
            </div>
          </div>

          <!-- Dynamic brush cursor preview circle -->
          <div id="brush-cursor" style="position:absolute; pointer-events:none; border:2px solid #2563EB; border-radius:50%; transform:translate(-50%, -50%); background:rgba(37,99,235,0.15); display:none; z-index:25;"></div>
        </div>

        <!-- AI Model Loading Overlay -->
        <div class="model-loading" id="model-loading" style="display:none">
          <div class="spinner" style="width:36px;height:36px;border-width:3.5px"></div>
          <div class="model-loading-text" id="model-loading-text">Loading AI Model...</div>
          <div class="model-loading-sub" id="model-loading-sub">Analyzing pixels and separating foreground...</div>
          <div class="progress-bar" style="width:240px">
            <div class="progress-bar-fill animate" id="model-progress-bar" style="width:10%"></div>
          </div>
        </div>
      </div>

      <!-- Zoom Controls Bar -->
      <div class="zoom-bar" id="zoom-bar" style="display:none">
        <button id="zoom-out" title="Zoom Out">${ICONS.zoomOut}</button>
        <span class="zoom-value" id="zoom-value">100%</span>
        <button id="zoom-in" title="Zoom In">${ICONS.zoomIn}</button>
        <button id="zoom-fit" title="Fit to Screen">${ICONS.fit}</button>
        <button id="zoom-reset" title="100% Scale" style="font-size:12px; font-weight:600; width:auto; padding:0 6px;">1:1</button>
      </div>
    </div>
  `;

  // View mode tabs
  editor.querySelectorAll('[data-vmode]').forEach(btn => {
    btn.addEventListener('click', () => {
      editor.querySelectorAll('[data-vmode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = (btn as HTMLElement).dataset.vmode as ViewMode;
      eventBus.emit('viewModeChange', mode);
    });
  });

  // Transform buttons
  editor.querySelector('#btn-rotate-left')?.addEventListener('click', () => eventBus.emit('action:rotate', -90));
  editor.querySelector('#btn-rotate-right')?.addEventListener('click', () => eventBus.emit('action:rotate', 90));
  editor.querySelector('#btn-flip-h')?.addEventListener('click', () => eventBus.emit('action:flip', 'horizontal'));
  editor.querySelector('#btn-flip-v')?.addEventListener('click', () => eventBus.emit('action:flip', 'vertical'));

  // Zoom controls
  editor.querySelector('#zoom-in')?.addEventListener('click', () => {
    const cs = state.getCanvasState();
    const newZoom = Math.min(+(cs.zoom + 0.25).toFixed(2), 5);
    state.updateCanvasState({ zoom: newZoom });
    updateZoomTransform();
  });

  editor.querySelector('#zoom-out')?.addEventListener('click', () => {
    const cs = state.getCanvasState();
    const newZoom = Math.max(+(cs.zoom - 0.25).toFixed(2), 0.25);
    state.updateCanvasState({ zoom: newZoom });
    updateZoomTransform();
  });

  editor.querySelector('#zoom-fit')?.addEventListener('click', () => {
    state.updateCanvasState({ zoom: 1, panX: 0, panY: 0 });
    updateZoomTransform();
  });

  editor.querySelector('#zoom-reset')?.addEventListener('click', () => {
    state.updateCanvasState({ zoom: 1, panX: 0, panY: 0 });
    updateZoomTransform();
  });

  // Export
  editor.querySelector('#export-btn')?.addEventListener('click', () => {
    eventBus.emit('exportImage', null);
  });

  // Setup Split Comparison Dragging
  setupSplitSlider(editor);

  return editor;
}

let splitPercent = 50;
let isDraggingSplit = false;

function setupSplitSlider(editor: HTMLElement): void {
  const container = editor.querySelector('#canvas-container') as HTMLElement;
  const divider = editor.querySelector('#split-divider') as HTMLElement;

  if (!container || !divider) return;

  const handleDrag = (clientX: number) => {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    splitPercent = pct;
    divider.style.left = `${pct}%`;
    eventBus.emit('splitChange', pct);
  };

  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSplit = true;
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingSplit) handleDrag(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    isDraggingSplit = false;
  });

  divider.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSplit = true;
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isDraggingSplit && e.touches[0]) handleDrag(e.touches[0].clientX);
  });

  window.addEventListener('touchend', () => {
    isDraggingSplit = false;
  });
}

export function updateZoomTransform(): void {
  const container = document.getElementById('canvas-container');
  const zoomValue = document.getElementById('zoom-value');
  const cs = state.getCanvasState();

  if (container) {
    container.style.transform = `scale(${cs.zoom}) translate(${cs.panX}px, ${cs.panY}px)`;
    container.style.transformOrigin = 'center center';
    container.style.transition = 'transform 0.1s ease';
  }

  if (zoomValue) {
    zoomValue.textContent = `${Math.round(cs.zoom * 100)}%`;
  }
}

/**
 * Render the image onto canvas with 100% reliable split view rendering
 */
export function showImageOnCanvas(
  processedImageData: ImageData | null,
  originalImageData?: ImageData | null,
  viewMode: ViewMode = 'split'
): void {
  const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  const emptyState = document.getElementById('empty-state');
  const wrapper = document.getElementById('preview-canvas-wrapper');
  const zoomBar = document.getElementById('zoom-bar');
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  const divider = document.getElementById('split-divider') as HTMLElement;

  if (!mainCanvas) return;

  if (!processedImageData && !originalImageData) {
    if (emptyState) emptyState.style.display = 'flex';
    if (wrapper) wrapper.style.display = 'none';
    if (zoomBar) zoomBar.style.display = 'none';
    if (exportBtn) exportBtn.disabled = true;
    if (divider) divider.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (wrapper) wrapper.style.display = 'flex';
  if (zoomBar) zoomBar.style.display = 'flex';
  if (exportBtn) exportBtn.disabled = !processedImageData;

  const targetData = processedImageData || originalImageData!;
  const w = targetData.width;
  const h = targetData.height;

  mainCanvas.width = w;
  mainCanvas.height = h;
  const ctx = mainCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  if (viewMode === 'original' && originalImageData) {
    if (divider) divider.style.display = 'none';
    ctx.putImageData(originalImageData, 0, 0);
  } else if (viewMode === 'result' && processedImageData) {
    if (divider) divider.style.display = 'none';
    ctx.putImageData(processedImageData, 0, 0);
  } else if (viewMode === 'split' && processedImageData && originalImageData) {
    if (divider) {
      divider.style.display = 'block';
      divider.style.left = `${splitPercent}%`;
    }

    // Step 1: Draw processed (cutout) onto background
    ctx.putImageData(processedImageData, 0, 0);

    // Step 2: Draw original image on left side up to splitX
    const splitX = Math.round((splitPercent / 100) * w);
    if (splitX > 0) {
      const origCanvas = document.createElement('canvas');
      origCanvas.width = w;
      origCanvas.height = h;
      origCanvas.getContext('2d')!.putImageData(originalImageData, 0, 0);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, h);
      ctx.clip();
      ctx.drawImage(origCanvas, 0, 0);
      ctx.restore();
    }
  } else {
    if (divider) divider.style.display = 'none';
    ctx.putImageData(targetData, 0, 0);
  }

  mainCanvas.style.maxWidth = '100%';
  mainCanvas.style.maxHeight = 'calc(100vh - var(--header-height) - var(--stats-bar-height) - 180px)';
  mainCanvas.style.objectFit = 'contain';
}

export function updateBrushCursor(x: number, y: number, size: number, show: boolean, tool: string = 'remove'): void {
  const cursor = document.getElementById('brush-cursor');
  if (!cursor) return;
  if (!show) {
    cursor.style.display = 'none';
    return;
  }
  const cs = state.getCanvasState();
  const scaledSize = Math.max(8, size * cs.zoom);
  cursor.style.display = 'block';
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
  cursor.style.width = `${scaledSize}px`;
  cursor.style.height = `${scaledSize}px`;

  if (tool === 'keep') {
    cursor.style.borderColor = '#16A34A';
    cursor.style.backgroundColor = 'rgba(22, 163, 74, 0.18)';
    cursor.style.boxShadow = '0 0 8px rgba(22, 163, 74, 0.3)';
  } else if (tool === 'eraser') {
    cursor.style.borderColor = '#F59E0B';
    cursor.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
    cursor.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.3)';
  } else if (tool === 'wand') {
    cursor.style.borderColor = '#8B5CF6';
    cursor.style.backgroundColor = 'rgba(139, 92, 246, 0.2)';
    cursor.style.boxShadow = '0 0 8px rgba(139, 92, 246, 0.35)';
  } else {
    cursor.style.borderColor = '#DC2626';
    cursor.style.backgroundColor = 'rgba(220, 38, 38, 0.18)';
    cursor.style.boxShadow = '0 0 8px rgba(220, 38, 38, 0.3)';
  }
}

export function showModelLoading(show: boolean, text?: string, progress?: number): void {
  const overlay = document.getElementById('model-loading');
  const textEl = document.getElementById('model-loading-text');
  const progressBar = document.getElementById('model-progress-bar');

  if (!overlay) return;
  overlay.style.display = show ? 'flex' : 'none';

  if (text && textEl) textEl.textContent = text;
  if (progress !== undefined && progressBar) {
    progressBar.style.width = `${Math.max(5, Math.round(progress * 100))}%`;
  }
}

export function updateEditorTitle(title: string, subtitle: string): void {
  const titleEl = document.getElementById('editor-title');
  const subtitleEl = document.getElementById('editor-subtitle');
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
}
