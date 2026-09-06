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
    <div class="stats-left">
      <div class="stat-chip">
        <span class="stat-badge stat-badge-blue" id="stat-uploaded">0</span>
        <span class="stat-chip-label">Uploaded</span>
      </div>
      <div class="stat-chip-divider"></div>
      <div class="stat-chip">
        <span class="stat-badge stat-badge-green" id="stat-completed">0</span>
        <span class="stat-chip-label">Completed</span>
      </div>
      <div class="stat-chip-divider"></div>
      <div class="stat-chip">
        <span class="stat-badge stat-badge-amber" id="stat-processing">0</span>
        <span class="stat-chip-label">Processing</span>
      </div>
      <div class="stat-chip-divider"></div>
      <div class="stat-chip">
        <span class="stat-badge stat-badge-slate" id="stat-total-time">0.0s</span>
        <span class="stat-chip-label">Total Time</span>
      </div>
      <div class="stat-chip-divider"></div>
      <div class="stat-chip">
        <span class="stat-badge stat-badge-slate" id="stat-avg-speed">—</span>
        <span class="stat-chip-label">Avg Speed</span>
      </div>
    </div>

    <div class="stats-center">
      <span class="engine-indicator-dot"></span>
      <span class="engine-status-text">AI Neural Engine Ready · Hardware Accelerated</span>
    </div>

    <div class="stats-right">
      <div class="performance-select-wrap">
        <span class="perf-label">Engine Mode</span>
        <div class="custom-select" id="custom-perf-select">
          <div class="custom-select-trigger" id="custom-perf-trigger">
            ${ICONS.scale} <span id="custom-perf-label">Balanced</span> ${ICONS.chevronDown}
          </div>
          <div class="custom-select-options" id="custom-perf-options" style="display:none;">
            <div class="custom-option selected" data-value="balanced">
              ${ICONS.scale} Balanced Mode
            </div>
            <div class="custom-option" data-value="speed">
              ${ICONS.lightning} Speed Priority
            </div>
            <div class="custom-option" data-value="quality">
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
