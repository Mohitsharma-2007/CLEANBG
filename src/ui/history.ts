/**
 * ClearBG AI Studio - History Page & Lightbox Studio Viewer
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 */

import { ICONS, mountIcons } from './icons';
import { fetchHistory, deleteHistory, clearAllHistoryRecords, checkBackendHealth } from '../storage/api-store';
import { events } from '../core/event-bus';
import type { HistoryItem } from '../storage/local-store';

export async function createHistoryPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'main-content view-enter';
  page.id = 'history-page';

  page.innerHTML = `
    <div class="center-header" style="background:var(--color-surface);border-bottom:1px solid var(--color-border); padding: 18px 28px; display:flex; justify-content:space-between; align-items:center;">
      <div class="center-title">
        <div style="display:flex; align-items:center; gap:12px;">
          <h2 style="margin:0; font-size:1.4rem; font-weight:700;">Processing History</h2>
          <span class="badge badge-primary" style="font-size:0.75rem; padding:3px 8px;">Cloud Sync & Local Cache</span>
        </div>
        <p style="margin-top:4px; color:var(--color-text-secondary); font-size:0.875rem;">Click any image to view in high-res or immediately reopen in CleanBG Studio for further editing.</p>
      </div>
      <div class="center-actions" style="display:flex; gap:10px;">
        <button class="btn btn-secondary btn-danger" id="clear-history-btn" style="display:inline-flex; align-items:center; gap:6px;">
          ${ICONS.close} Clear All History
        </button>
      </div>
    </div>
    <div class="history-grid" id="history-grid" style="padding:28px; display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:20px;">
      <div class="spinner" style="grid-column: 1/-1; margin: 60px auto;"></div>
    </div>
  `;

  // Render items
  renderHistoryItems(page);

  page.querySelector('#clear-history-btn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to permanently clear all history records?')) {
      await clearAllHistoryRecords();
      renderHistoryItems(page);
    }
  });

  return page;
}

async function renderHistoryItems(page: HTMLElement): Promise<void> {
  const grid = page.querySelector('#history-grid')!;
  const { items } = await fetchHistory();

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align:center; padding:60px 20px;">
        <div style="font-size:3rem; margin-bottom:12px;">🖼️</div>
        <h3 style="font-size:1.2rem; font-weight:600; margin-bottom:8px;">No History Records Yet</h3>
        <p style="color:var(--color-text-muted); max-width:400px; margin:0 auto 20px;">Images processed in Background Remover, Resizer, Compressor, or Upscaler will automatically be saved here.</p>
        <button class="btn btn-primary" id="btn-empty-start" style="padding:8px 20px;">Start Removing Backgrounds</button>
      </div>
    `;
    page.querySelector('#btn-empty-start')?.addEventListener('click', () => {
      events.emit('navigate', 'remove-bg');
    });
    return;
  }

  grid.innerHTML = items.map(item => {
    // Generate fresh blob URL fallback in case thumbnail is missing
    const blobUrl = item.resultBlob ? URL.createObjectURL(item.resultBlob) : '';
    const displayThumb = item.thumbnail && item.thumbnail.length > 30 ? item.thumbnail : blobUrl;

    return `
      <div class="history-card" data-history-id="${item.id}" style="cursor:default;">
        <div class="history-thumb-wrapper" data-open-id="${item.id}" title="Click to view & edit ${item.name}">
          ${item.originalBlob ? '<span class="history-orig-badge" style="position:absolute; top:8px; left:8px; font-size:0.68rem; padding:2px 7px; z-index:3; background:rgba(37,99,235,0.9); color:#fff; border-radius:4px; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,0.2);">Original Saved</span>' : ''}
          <img class="history-card-image checkerboard"
               src="${displayThumb}"
               alt="${item.name}"
               data-blob="${blobUrl}"
               onerror="if (this.dataset.blob) this.src = this.dataset.blob;"
               loading="lazy" />
          <div class="history-card-hover-overlay">
            <span class="hover-btn-text">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              View & Open
            </span>
          </div>
          <span class="history-badge-res">${item.width || 0}×${item.height || 0}</span>
        </div>
        <div class="history-card-info" style="padding:12px 14px;">
          <div class="history-card-name" title="${item.name}" style="font-weight:600; font-size:0.9rem;">${item.name}</div>
          <div class="history-card-meta" style="font-size:0.75rem; color:var(--color-text-muted); margin-top:3px;">
            ${item.tool || 'Background Remover'} · ${new Date(item.timestamp).toLocaleDateString()}
          </div>
        </div>
        <div class="history-card-actions" style="padding:0 14px 14px; display:flex; gap:8px;">
          <button class="btn btn-sm btn-primary" data-hedit="${item.id}" title="Re-open in CleanBG Studio" style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:5px; font-weight:600;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit in Studio
          </button>
          <button class="btn btn-sm btn-secondary" data-hdl="${item.id}" title="Download PNG" style="padding:6px 10px;">
            ${ICONS.download}
          </button>
          <button class="btn btn-sm btn-secondary btn-danger-hover" data-hdel="${item.id}" title="Delete record" style="padding:6px 10px;">
            ${ICONS.close}
          </button>
        </div>
      </div>
    `;
  }).join('');

  mountIcons();

  // 1. Click on thumbnail opens Lightbox Modal
  grid.querySelectorAll('[data-open-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.openId!;
      const item = items.find(x => x.id === id);
      if (item) {
        openHistoryLightbox(item, () => renderHistoryItems(page));
      }
    });
  });

  // 2. Click "Edit in Studio" button
  grid.querySelectorAll('[data-hedit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.hedit!;
      const item = items.find(x => x.id === id);
      if (item) {
        openItemInStudio(item);
      }
    });
  });

  // 3. Download button
  grid.querySelectorAll('[data-hdl]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.hdl!;
      const item = items.find(x => x.id === id);
      if (item) {
        downloadHistoryItem(item);
      }
    });
  });

  // 4. Delete button
  grid.querySelectorAll('[data-hdel]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.hdel!;
      if (confirm('Delete this image from history?')) {
        await deleteHistory(id);
        renderHistoryItems(page);
      }
    });
  });
}

/**
 * Open history item directly into CleanBG Studio workspace
 */
export function openItemInStudio(item: HistoryItem): void {
  events.emit('history:openInStudio', item);
}

function downloadHistoryItem(item: HistoryItem): void {
  const url = URL.createObjectURL(item.resultBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.name.endsWith('.png') ? item.name : `cleanbg_${item.name}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Open full-resolution Lightbox viewer with instant actions
 */
function openHistoryLightbox(item: HistoryItem, onRefresh?: () => void): void {
  const existing = document.getElementById('history-lightbox');
  if (existing) existing.remove();

  const imgUrl = URL.createObjectURL(item.resultBlob);
  const origImgUrl = item.originalBlob ? URL.createObjectURL(item.originalBlob) : null;

  const modal = document.createElement('div');
  modal.id = 'history-lightbox';
  modal.className = 'history-lightbox-overlay';

  modal.innerHTML = `
    <div class="history-lightbox-dialog">
      <div class="history-lightbox-header">
        <div class="history-lightbox-title-group" style="display:flex; align-items:center; gap:10px;">
          <span class="badge badge-primary">High-Res Cutout</span>
          ${origImgUrl ? '<span class="badge badge-success" style="background:#10B981; color:#fff;">Original Preserved</span>' : ''}
          <h3 class="history-lightbox-title">${item.name}</h3>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          ${origImgUrl ? `
            <div class="lightbox-view-toggle" style="display:inline-flex; border:1px solid var(--color-border); border-radius:6px; overflow:hidden;">
              <button class="btn btn-sm btn-primary active" id="lb-view-cutout" style="padding:4px 10px; font-size:0.75rem; border-radius:0;">Cutout</button>
              <button class="btn btn-sm btn-secondary" id="lb-view-orig" style="padding:4px 10px; font-size:0.75rem; border-radius:0;">Original</button>
            </div>
          ` : ''}
          <button class="history-lightbox-close" id="lightbox-close-btn" title="Close (Esc)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div class="history-lightbox-body checkerboard">
        <img id="history-lightbox-main-img" src="${imgUrl}" alt="${item.name}" class="history-lightbox-img" />
      </div>

      <div class="history-lightbox-footer">
        <div class="history-lightbox-meta">
          <span><strong>Resolution:</strong> ${item.width} × ${item.height} px</span>
          <span><strong>Size:</strong> ${(item.resultSize / 1024).toFixed(1)} KB</span>
          <span><strong>Tool:</strong> ${item.tool}</span>
        </div>
        <div class="history-lightbox-actions">
          <button class="btn btn-secondary" id="lightbox-del-btn" style="color:var(--color-danger);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
          </button>
          <button class="btn btn-secondary" id="lightbox-dl-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download PNG
          </button>
          <button class="btn btn-primary" id="lightbox-edit-btn" style="display:inline-flex; align-items:center; gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Open in Studio
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const mainImg = modal.querySelector('#history-lightbox-main-img') as HTMLImageElement;

  if (origImgUrl) {
    const btnCutout = modal.querySelector('#lb-view-cutout') as HTMLElement;
    const btnOrig = modal.querySelector('#lb-view-orig') as HTMLElement;
    btnCutout?.addEventListener('click', () => {
      btnCutout.className = 'btn btn-sm btn-primary active';
      btnOrig.className = 'btn btn-sm btn-secondary';
      if (mainImg) mainImg.src = imgUrl;
    });
    btnOrig?.addEventListener('click', () => {
      btnOrig.className = 'btn btn-sm btn-primary active';
      btnCutout.className = 'btn btn-sm btn-secondary';
      if (mainImg) mainImg.src = origImgUrl;
    });
  }

  const cleanup = () => {
    URL.revokeObjectURL(imgUrl);
    if (origImgUrl) URL.revokeObjectURL(origImgUrl);
    window.removeEventListener('keydown', handleKey);
    modal.remove();
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cleanup();
  };
  window.addEventListener('keydown', handleKey);

  modal.querySelector('#lightbox-close-btn')?.addEventListener('click', cleanup);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cleanup();
  });

  modal.querySelector('#lightbox-dl-btn')?.addEventListener('click', () => {
    downloadHistoryItem(item);
  });

  modal.querySelector('#lightbox-del-btn')?.addEventListener('click', async () => {
    if (confirm('Delete this image from history?')) {
      await deleteHistory(item.id);
      cleanup();
      onRefresh?.();
    }
  });

  modal.querySelector('#lightbox-edit-btn')?.addEventListener('click', () => {
    cleanup();
    openItemInStudio(item);
  });
}
