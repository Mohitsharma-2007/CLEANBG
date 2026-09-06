import { events } from '../core/event-bus';
import { queueManager } from '../queue/queue-manager';

export function createUploadZone(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'upload-container';
  container.innerHTML = `
    <div class="upload-zone" role="button" tabindex="0" aria-label="Upload images">
      <div class="upload-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <h2>Drop images here</h2>
      <p>or click to browse</p>
      <div class="upload-formats">PNG, JPG, JPEG, WebP — Max 50MB</div>
      <input type="file" class="sr-only" accept="image/png,image/jpeg,image/webp" multiple />
    </div>
    <div class="url-input-row">
      <span class="url-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </span>
      <input type="url" class="input url-input" id="url-input" placeholder="Paste image URL and press Enter" />
      <button class="btn btn-primary btn-sm" id="url-fetch-btn">Fetch</button>
    </div>
    <div class="upload-stats hidden" id="upload-stats"></div>
  `;

  const zone = container.querySelector('.upload-zone') as HTMLElement;
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  const urlInput = container.querySelector('#url-input') as HTMLInputElement;
  const fetchBtn = container.querySelector('#url-fetch-btn') as HTMLButtonElement;

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      handleFiles(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer?.files.length) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  async function fetchFromUrl() {
    const url = urlInput.value.trim();
    if (!url) return;

    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Fetching...';

    try {
      await handleUrl(url);
      urlInput.value = '';
    } catch (err: any) {
      events.emit('notification:show', {
        type: 'error',
        message: err.message || 'Failed to fetch image',
      });
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.textContent = 'Fetch';
    }
  }

  urlInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchFromUrl();
    }
  });

  fetchBtn.addEventListener('click', fetchFromUrl);

  return container;
}

async function handleUrl(url: string): Promise<void> {
  const startTime = Date.now();

  let fetchUrl = url;

  if (url.startsWith('data:')) {
    const blob = dataUrlToBlob(url);
    const file = new File([blob], 'image.png', { type: blob.type });
    await handleFiles([file]);
    return;
  }

  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  const imageExtensions = /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i;
  let ext = 'png';
  const match = url.match(imageExtensions);
  if (match) {
    ext = match[1].toLowerCase();
    if (ext === 'jpg') ext = 'jpeg';
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const blob = await response.blob();

  let mimeType = contentType.split(';')[0].trim();
  if (!mimeType.startsWith('image/')) {
    const typeMap: Record<string, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };
    mimeType = typeMap[ext] || 'image/png';
  }

  const imageBlob = new Blob([blob], { type: mimeType });
  const filename = extractFilename(url) || `image.${ext}`;
  const file = new File([imageBlob], filename, { type: mimeType });

  const elapsed = Date.now() - startTime;
  events.emit('upload:start', { count: 1 });
  await handleFiles([file]);
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    if (last && last.includes('.')) {
      return decodeURIComponent(last);
    }
  } catch {}
  return '';
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

async function handleFiles(files: File[]): Promise<void> {
  const startTime = Date.now();

  events.emit('upload:start', { count: files.length });

  const ids = await queueManager.addImages(files);

  const elapsed = Date.now() - startTime;

  events.emit('upload:complete', {
    count: ids.length,
    failed: files.length - ids.length,
    time: elapsed,
  });
}
