import { events } from '../core/event-bus';
import { state } from '../core/state';
import { queueManager } from '../queue/queue-manager';
import { formatFileSize } from '../utils/temp-files';
import type { ProcessingJob, ImageFile } from '../core/types';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  queued: 'Queued',
  processing: 'Processing',
  complete: 'Complete',
  error: 'Error',
  cancelled: 'Cancelled',
};

export function createQueuePanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'queue-panel';
  panel.innerHTML = `
    <div class="queue-header">
      <h3>Processing Queue</h3>
      <div class="queue-actions">
        <button class="btn btn-sm btn-secondary" id="process-all">Process All</button>
        <button class="btn btn-sm btn-ghost" id="clear-queue">Clear</button>
      </div>
    </div>
    <div class="queue-list" id="queue-list">
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M12 8v8"/>
          <path d="M8 12h8"/>
        </svg>
        <h3>No images in queue</h3>
        <p>Upload images to get started</p>
      </div>
    </div>
    <div class="queue-metrics hidden" id="queue-metrics"></div>
  `;

  panel.querySelector('#process-all')?.addEventListener('click', () => {
    queueManager.processAll();
  });

  panel.querySelector('#clear-queue')?.addEventListener('click', () => {
    const s = state.get();
    s.queue.forEach(imageId => state.removeImage(imageId));
    s.queue.length = 0;
    events.emit('queue:updated');
  });

  events.on('queue:updated', () => updateQueueList());
  events.on('job:created', () => updateQueueList());
  events.on('job:progress', () => updateQueueList());
  events.on('job:complete', () => updateQueueList());
  events.on('job:error', () => updateQueueList());
  events.on('job:cancelled', () => updateQueueList());
  events.on('job:removed', () => updateQueueList());

  return panel;
}

function updateQueueList(): void {
  const list = document.getElementById('queue-list');
  if (!list) return;

  const s = state.get();
  const images = s.images;
  const jobs = s.jobs;
  const queue = s.queue;

  if (queue.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M12 8v8"/>
          <path d="M8 12h8"/>
        </svg>
        <h3>No images in queue</h3>
        <p>Upload images to get started</p>
      </div>
    `;
    return;
  }

  list.innerHTML = queue.map(imageId => {
    const img = images.get(imageId);
    if (!img) return '';
    const job = state.getJobByImageId(imageId);
    return createQueueItem(img, job);
  }).join('');

  list.querySelectorAll('.queue-item').forEach(item => {
    const imageId = item.getAttribute('data-image-id')!;

    item.querySelector('.btn-edit')?.addEventListener('click', () => {
      events.emit('image:edit', imageId);
    });

    item.querySelector('.btn-export')?.addEventListener('click', () => {
      events.emit('image:export', imageId);
    });

    item.querySelector('.btn-retry')?.addEventListener('click', () => {
      queueManager.reprocessImage(imageId);
    });

    item.querySelector('.btn-remove')?.addEventListener('click', () => {
      queueManager.removeJob(imageId);
    });
  });

  updateMetrics();
}

function createQueueItem(img: ImageFile, job?: ProcessingJob): string {
  const status = job?.status || 'idle';
  const progress = job?.progress || 0;

  return `
    <div class="queue-item" data-image-id="${img.id}">
      <div class="queue-thumb checkerboard">
        <img src="${img.thumbnail}" alt="${img.name}" loading="lazy" />
      </div>
      <div class="queue-info">
        <div class="queue-name" title="${img.name}">${img.name}</div>
        <div class="queue-meta">
          ${img.width}×${img.height} · ${formatFileSize(img.size)}
        </div>
        ${status === 'processing' ? `
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${Math.round(progress * 100)}%"></div>
          </div>
        ` : ''}
      </div>
      <div class="queue-status">
        <span class="badge badge-${status}">${STATUS_LABELS[status]}</span>
      </div>
      <div class="queue-actions-row">
        ${status === 'complete' ? `
          <button class="btn btn-sm btn-primary btn-edit">Edit</button>
          <button class="btn btn-sm btn-secondary btn-export">Export</button>
        ` : status === 'error' ? `
          <button class="btn btn-sm btn-secondary btn-retry">Retry</button>
        ` : ''}
        <button class="btn btn-sm btn-ghost btn-remove" title="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function updateMetrics(): void {
  const metrics = document.getElementById('queue-metrics');
  if (!metrics) return;

  const m = queueManager.getMetrics();
  if (m.totalProcessed === 0) {
    metrics.classList.add('hidden');
    return;
  }

  metrics.classList.remove('hidden');
  metrics.innerHTML = `
    <div class="metric-row">
      <span>Avg. processing time</span>
      <span>${(m.avgProcessingTime / 1000).toFixed(1)}s</span>
    </div>
    <div class="metric-row">
      <span>Throughput</span>
      <span>${m.throughput.toFixed(1)} img/s</span>
    </div>
    <div class="metric-row">
      <span>Total processed</span>
      <span>${m.totalProcessed}</span>
    </div>
  `;
}
