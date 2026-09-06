import { events } from '../core/event-bus';
import { state } from '../core/state';
import { encodeImageWithBackground } from '../processing/image-encoder';
import { downloadBlob } from '../utils/temp-files';
import type { ImageFormat } from '../core/types';

export function createExportDialog(): HTMLElement {
  const dialog = document.createElement('div');
  dialog.className = 'modal-overlay hidden';
  dialog.id = 'export-dialog';
  dialog.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Export Image</h3>
        <button class="btn-icon btn-ghost modal-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="export-preview checkerboard" id="export-preview"></div>
        <div class="export-controls">
          <div class="setting-row">
            <label class="label" for="export-format">Format</label>
            <select class="select" id="export-format">
              <option value="png" selected>PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div class="setting-row" id="quality-row">
            <label class="label" for="export-quality">Quality</label>
            <div class="setting-control">
              <input type="range" min="1" max="100" value="92" id="export-quality" class="slider" />
              <span class="setting-value" id="export-quality-value">92%</span>
            </div>
          </div>
          <div class="setting-row">
            <label class="checkbox-label">
              <input type="checkbox" class="checkbox" id="export-bg-toggle" />
              <span>Background Color</span>
            </label>
            <div class="setting-control hidden" id="bg-color-row">
              <input type="color" value="#ffffff" id="export-bg-color" class="color-input" />
            </div>
          </div>
          <div class="setting-row">
            <label class="label">Est. File Size</label>
            <span class="setting-value" id="export-estimate">—</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="export-cancel">Cancel</button>
        <button class="btn btn-primary" id="export-confirm">Download</button>
      </div>
    </div>
  `;

  let currentImageId: string | null = null;

  dialog.querySelector('.modal-close')?.addEventListener('click', () => close());
  dialog.querySelector('#export-cancel')?.addEventListener('click', () => close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  dialog.querySelector('#export-format')?.addEventListener('change', updateEstimate);
  dialog.querySelector('#export-quality')?.addEventListener('input', updateEstimate);

  dialog.querySelector('#export-bg-toggle')?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    dialog.querySelector('#bg-color-row')?.classList.toggle('hidden', !checked);
  });

  dialog.querySelector('#export-confirm')?.addEventListener('click', async () => {
    if (!currentImageId) return;

    const format = (dialog.querySelector('#export-format') as HTMLSelectElement).value as ImageFormat;
    const quality = parseInt((dialog.querySelector('#export-quality') as HTMLInputElement).value);
    const bgEnabled = (dialog.querySelector('#export-bg-toggle') as HTMLInputElement).checked;
    const bgColor = (dialog.querySelector('#export-bg-color') as HTMLInputElement).value;

    const job = state.getJobByImageId(currentImageId);
    if (!job?.result) return;

    try {
      const blob = await encodeImageWithBackground(
        job.result.imageData,
        format,
        quality / 100,
        bgEnabled ? bgColor : '#ffffff'
      );

      const imageFile = state.get().images.get(currentImageId);
      const baseName = imageFile?.name.replace(/\.[^.]+$/, '') || 'image';
      downloadBlob(blob, `${baseName}.${format}`);

      events.emit('notification:show', {
        type: 'success',
        message: `Exported as ${format.toUpperCase()}`,
      });

      close();
    } catch (err: any) {
      events.emit('notification:show', {
        type: 'error',
        message: `Export failed: ${err.message}`,
      });
    }
  });

  function open(imageId: string): void {
    currentImageId = imageId;
    dialog.classList.remove('hidden');

    const job = state.getJobByImageId(imageId);
    if (job?.result) {
      const preview = dialog.querySelector('#export-preview') as HTMLElement;
      const canvas = document.createElement('canvas');
      canvas.width = job.result.imageData.width;
      canvas.height = job.result.imageData.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(job.result.imageData, 0, 0);
      preview.style.backgroundImage = `url(${canvas.toDataURL()})`;
      preview.style.backgroundSize = 'contain';
      preview.style.backgroundRepeat = 'no-repeat';
      preview.style.backgroundPosition = 'center';
    }

    updateEstimate();
  }

  function close(): void {
    dialog.classList.add('hidden');
    currentImageId = null;
  }

  function updateEstimate(): void {
    const format = (dialog.querySelector('#export-format') as HTMLSelectElement)?.value as ImageFormat;
    const quality = parseInt((dialog.querySelector('#export-quality') as HTMLInputElement)?.value || '92');
    const estimate = dialog.querySelector('#export-estimate');

    if (!currentImageId || !estimate) return;

    const job = state.getJobByImageId(currentImageId);
    if (!job?.result) return;

    const pixels = job.result.imageData.width * job.result.imageData.height;
    const bpp = format === 'png' ? 3 : quality < 50 ? 0.3 : quality < 80 ? 0.7 : 1.2;
    const bytes = Math.round(pixels * bpp);

    estimate.textContent = bytes < 1024 * 1024
      ? `~${(bytes / 1024).toFixed(0)} KB`
      : `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  events.on('image:export', (imageId: string) => open(imageId));

  return dialog;
}
