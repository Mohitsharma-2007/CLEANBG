import { ICONS } from './icons';
import { eventBus } from '../core/event-bus';
import { state } from '../core/state';

export function createSidebar(): HTMLElement {
  const sidebar = document.createElement('aside');
  sidebar.className = 'left-sidebar';
  sidebar.id = 'left-sidebar';

  sidebar.innerHTML = `
    <div class="sidebar-upload-section">
      <button class="btn-upload" id="sidebar-upload-btn">
        ${ICONS.upload}
        Upload Image
      </button>
      <div class="sidebar-dropzone" id="sidebar-dropzone">
        <div class="sidebar-dropzone-icon">${ICONS.uploadPlus}</div>
        <div class="sidebar-dropzone-text">Drop images here</div>
        <div class="sidebar-dropzone-sub">PNG, JPG, WebP up to 20MB</div>
      </div>
      <input type="file" id="sidebar-file-input" accept="image/*" multiple style="display:none" />
    </div>
    <div class="sidebar-file-header" id="sidebar-file-header" style="display:none">
      <h3>Files (<span id="sidebar-file-count">0</span>)</h3>
      <button id="sidebar-clear-all">Clear All</button>
    </div>
    <div class="sidebar-file-list" id="sidebar-file-list"></div>
    <div class="sidebar-add-more" id="sidebar-add-more" style="display:none">
      <button id="sidebar-add-more-btn">${ICONS.plus} Add More Images</button>
    </div>
  `;

  // File input handling
  const fileInput = sidebar.querySelector('#sidebar-file-input') as HTMLInputElement;
  const uploadBtn = sidebar.querySelector('#sidebar-upload-btn')!;
  const dropzone = sidebar.querySelector('#sidebar-dropzone')!;
  const addMoreBtn = sidebar.querySelector('#sidebar-add-more-btn');

  uploadBtn.addEventListener('click', () => fileInput.click());
  addMoreBtn?.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e: Event) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const de = e as DragEvent;
    const files = de.dataTransfer?.files;
    if (files) handleFiles(Array.from(files));
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files) {
      handleFiles(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  // Clear all
  sidebar.querySelector('#sidebar-clear-all')?.addEventListener('click', () => {
    eventBus.emit('clearAll', null);
  });

  return sidebar;
}

function handleFiles(files: File[]): void {
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  if (imageFiles.length === 0) return;
  eventBus.emit('filesSelected', imageFiles);
}

export function updateSidebarFileList(): void {
  const appState = state.get();
  const fileList = document.getElementById('sidebar-file-list');
  const fileHeader = document.getElementById('sidebar-file-header');
  const addMore = document.getElementById('sidebar-add-more');
  const fileCount = document.getElementById('sidebar-file-count');

  if (!fileList) return;

  const images = Array.from(appState.images.values());

  if (images.length === 0) {
    if (fileHeader) fileHeader.style.display = 'none';
    if (addMore) addMore.style.display = 'none';
    fileList.innerHTML = '';
    return;
  }

  if (fileHeader) fileHeader.style.display = 'flex';
  if (addMore) addMore.style.display = 'block';
  if (fileCount) fileCount.textContent = String(images.length);

  fileList.innerHTML = images.map(img => {
    const job = state.getJobByImageId(img.id);
    const isActive = img.id === appState.currentImageId;
    let statusClass = 'pending';
    let statusText = 'Ready';
    let statusIcon = '';

    if (job) {
      switch (job.status) {
        case 'processing':
          statusClass = 'processing';
          statusText = `${Math.round(job.progress * 100)}%`;
          statusIcon = '<span class="spinner" style="width:12px;height:12px;border-width:1.5px"></span>';
          break;
        case 'complete':
          statusClass = 'completed';
          statusText = 'Done';
          statusIcon = `<span class="file-status-icon success">${ICONS.check}</span>`;
          break;
        case 'error':
          statusClass = 'error';
          statusText = 'Failed';
          break;
        case 'queued':
          statusClass = 'pending';
          statusText = 'Queued';
          break;
      }
    }

    return `
      <div class="file-item ${isActive ? 'active' : ''}" data-image-id="${img.id}">
        <div class="file-thumb">
          <img src="${img.thumbnail}" alt="${img.name}" />
        </div>
        <div class="file-info">
          <div class="file-name">${img.name}</div>
          <div class="file-meta">${img.width}×${img.height} · ${formatSize(img.size)}</div>
          <div class="file-status ${statusClass}">${statusIcon} ${statusText}</div>
        </div>
        <button class="file-remove-btn" data-remove-id="${img.id}" title="Remove">
          ${ICONS.close}
        </button>
      </div>
    `;
  }).join('');

  // Click handlers
  fileList.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.file-remove-btn')) return;
      const id = (item as HTMLElement).dataset.imageId!;
      eventBus.emit('selectImage', id);
    });
  });

  fileList.querySelectorAll('.file-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.removeId!;
      eventBus.emit('removeImage', id);
    });
  });
  

}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
