import { ICONS } from './icons';
import { fetchHistory, deleteHistory, clearAllHistoryRecords, checkBackendHealth } from '../storage/api-store';

export async function createHistoryPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'main-content view-enter';
  page.id = 'history-page';

  page.innerHTML = `
    <div class="center-header" style="background:var(--color-surface);border-bottom:1px solid var(--color-border); padding: 16px 24px;">
      <div class="center-title">
        <div style="display:flex; align-items:center; gap:12px;">
          <h2 style="margin:0">Processing History</h2>
        </div>
        <p style="margin-top:4px; color:var(--color-text-secondary);">View and download previously processed images stored in PostgreSQL</p>
      </div>
      <div class="center-actions">
        <button class="btn btn-secondary btn-danger" id="clear-history-btn">
          ${ICONS.close} Clear All History
        </button>
      </div>
    </div>
    <div class="history-grid" id="history-grid" style="padding:24px;">
      <div class="spinner" style="grid-column: 1/-1; margin: 40px auto;"></div>
    </div>
  `;

  // Render items
  renderHistoryItems(page);

  page.querySelector('#clear-history-btn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all history?')) {
      await clearAllHistoryRecords();
      renderHistoryItems(page);
    }
  });

  return page;
}

async function renderHistoryItems(page: HTMLElement): Promise<void> {
  const grid = page.querySelector('#history-grid')!;
  const { items, source } = await fetchHistory();

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        ${ICONS.history}
        <h3>No History Records</h3>
        <p>Images processed in Background Remover, Resizer, Compressor, or Upscaler will be stored here</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="history-card" data-history-id="${item.id}">
      <img class="history-card-image checkerboard" src="${item.thumbnail}" alt="${item.name}" />
      <div class="history-card-info">
        <div class="history-card-name">${item.name}</div>
        <div class="history-card-meta">${item.tool} · ${new Date(item.timestamp).toLocaleDateString()}</div>
      </div>
      <div class="history-card-actions">
        <button class="btn btn-sm btn-primary" data-hdl="${item.id}" style="flex:1">
          ${ICONS.download} Download
        </button>
        <button class="btn btn-sm btn-secondary" data-hdel="${item.id}">
          ${ICONS.close}
        </button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-hdl]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.hdl!;
      const item = items.find(x => x.id === id);
      if (item) {
        const url = URL.createObjectURL(item.resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clearbg_${item.name}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  });

  grid.querySelectorAll('[data-hdel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.hdel!;
      await deleteHistory(id);
      renderHistoryItems(page);
    });
  });
}
