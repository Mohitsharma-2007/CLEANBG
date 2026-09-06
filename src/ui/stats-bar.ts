import { state } from '../core/state';
import { ICONS } from './icons';

interface StatsState {
  uploaded: number;
  completed: number;
  processing: number;
  totalTime: number;
  avgSpeed: number;
}

export function createStatsBar(): HTMLElement {
  const bar = document.createElement('footer');
  bar.className = 'stats-bar';
  bar.id = 'stats-bar';

  bar.innerHTML = `
    <div class="stats-items">
      <div class="stat-item">
        <span class="stat-value highlight" id="stat-uploaded">0</span>
        <span class="stat-label">Uploaded</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value success" id="stat-completed">0</span>
        <span class="stat-label">Completed</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value" id="stat-processing">0</span>
        <span class="stat-label">Processing</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value" id="stat-total-time">0.0s</span>
        <span class="stat-label">Total Time</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value" id="stat-avg-speed">—</span>
        <span class="stat-label">Avg Speed</span>
      </div>
    </div>
    <div class="stats-right">
      <div class="performance-select" style="display:flex; align-items:center; gap:12px;">
        <label style="font-size:12px; font-weight:600; color:var(--color-text-muted);">Performance</label>
        <div class="custom-select" id="custom-perf-select" style="position:relative; width: 170px;">
          <div class="custom-select-trigger" id="custom-perf-trigger" style="display:flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid var(--color-border); border-radius:var(--radius-md); background:var(--color-surface); cursor:pointer; font-size:13px; font-weight:500;">
            ${ICONS.scale} <span id="custom-perf-label" style="flex:1;">Balanced</span> ${ICONS.chevronDown}
          </div>
          <div class="custom-select-options" id="custom-perf-options" style="display:none; position:absolute; bottom:100%; left:0; right:0; margin-bottom:4px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); box-shadow:var(--shadow-md); z-index:50; overflow:hidden;">
            <div class="custom-option selected" data-value="balanced" style="display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:pointer; font-size:13px; font-weight:500; border-bottom:1px solid var(--color-border);">
              ${ICONS.scale} Balanced
            </div>
            <div class="custom-option" data-value="speed" style="display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:pointer; font-size:13px; font-weight:500; border-bottom:1px solid var(--color-border);">
              ${ICONS.lightning} Speed Priority
            </div>
            <div class="custom-option" data-value="quality" style="display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:pointer; font-size:13px; font-weight:500;">
              ${ICONS.sparkle} Quality Priority
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Custom Dropdown Logic
  const trigger = bar.querySelector('#custom-perf-trigger') as HTMLElement;
  const optionsPanel = bar.querySelector('#custom-perf-options') as HTMLElement;
  const label = bar.querySelector('#custom-perf-label') as HTMLElement;
  const options = bar.querySelectorAll('.custom-option');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = optionsPanel.style.display !== 'none';
    optionsPanel.style.display = isVisible ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target as Node)) {
      optionsPanel.style.display = 'none';
    }
  });

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      const val = (opt as HTMLElement).dataset.value;
      const text = opt.textContent?.trim() || '';
      
      // Update label
      label.textContent = text;
      
      // Update styling
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      
      optionsPanel.style.display = 'none';
      
      // Mount newly injected icons? Actually the trigger icon is static but we might want to update it.
      // For simplicity, let's just keep the active text, or update the trigger innerHTML completely:
      let icon = ICONS.scale;
      if (val === 'speed') icon = ICONS.lightning;
      if (val === 'quality') icon = ICONS.sparkle;
      
      trigger.innerHTML = `${icon} <span id="custom-perf-label" style="flex:1;">${text}</span> ${ICONS.chevronDown}`;

      
      state.set('performanceMode', val as any);
    });
  });

  return bar;
}

export function updateStats(): void {
  const appState = state.get();
  const stats = computeStats(appState);

  setTextById('stat-uploaded', String(stats.uploaded));
  setTextById('stat-completed', String(stats.completed));
  setTextById('stat-processing', String(stats.processing));
  setTextById('stat-total-time', `${stats.totalTime.toFixed(1)}s`);
  setTextById('stat-avg-speed', stats.avgSpeed > 0 ? `${stats.avgSpeed.toFixed(1)}s` : '—');
}

function computeStats(appState: any): StatsState {
  let uploaded = 0, completed = 0, processing = 0, totalTime = 0;
  const times: number[] = [];

  uploaded = appState.images.size;

  for (const job of appState.jobs.values()) {
    if (job.status === 'complete') {
      completed++;
      if (job.startTime && job.endTime) {
        const t = (job.endTime - job.startTime) / 1000;
        totalTime += t;
        times.push(t);
      }
    } else if (job.status === 'processing') {
      processing++;
    }
  }

  const avgSpeed = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

  return { uploaded, completed, processing, totalTime, avgSpeed };
}

function setTextById(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
