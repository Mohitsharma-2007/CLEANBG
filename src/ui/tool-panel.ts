import { eventBus } from '../core/event-bus';
import { ICONS } from './icons';
import { FILTER_PRESETS } from '../processing/image-effects';

export function createToolPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'right-panel';
  panel.innerHTML = `
    <div class="right-panel-header">
      <div class="right-panel-top-row">
        <div class="right-panel-brand">
          <span class="right-panel-brand-icon">${ICONS.wand}</span>
          <span class="right-panel-title">Studio Tools</span>
        </div>
        <button class="btn-studio-shortcut" id="btn-launch-editor-top" title="Open Full Studio Editor (Filerobot Suite)">
          ${ICONS.sparkle}
          <span>Full Studio</span>
        </button>
      </div>
      <div class="right-panel-tabs" role="tablist">
        <button class="right-panel-tab active" data-ptab="retouch" id="tab-retouch" title="Retouch & Erase">
          <span class="tab-icon">${ICONS.wand}</span>
          <span class="tab-label">Retouch</span>
        </button>
        <button class="right-panel-tab" data-ptab="adjust" id="tab-adjust" title="Lighting & Color Adjustments">
          <span class="tab-icon">${ICONS.sliders}</span>
          <span class="tab-label">Adjust</span>
        </button>
        <button class="right-panel-tab" data-ptab="filters" id="tab-filters" title="Creative Preset Filters">
          <span class="tab-icon">${ICONS.sparkle}</span>
          <span class="tab-label">Filters</span>
        </button>
        <button class="right-panel-tab" data-ptab="effects" id="tab-effects" title="Sticker Outline, Shadow & Blur">
          <span class="tab-icon">${ICONS.layers}</span>
          <span class="tab-label">Styles</span>
        </button>
        <button class="right-panel-tab" data-ptab="background" id="tab-bg" title="Custom Backdrops & Gradients">
          <span class="tab-icon">${ICONS.image}</span>
          <span class="tab-label">Backdrop</span>
        </button>
        <button class="right-panel-tab" data-ptab="export" id="tab-export" title="Export & Quality">
          <span class="tab-icon">${ICONS.download}</span>
          <span class="tab-label">Export</span>
        </button>
      </div>
    </div>

    <!-- 1. RETOUCH & EDGE TAB -->
    <div class="right-panel-body" id="pbody-retouch">
      <div class="tool-section">
        <div class="tool-section-title">Retouch Tool</div>
        <div class="tool-buttons" style="display:grid; grid-template-columns:repeat(4,1fr); gap:4px;">
          <button class="tool-btn active" data-tool="remove" id="tool-remove" title="Erase background">
            ${ICONS.remove}
            <span>Erase</span>
          </button>
          <button class="tool-btn" data-tool="keep" id="tool-keep" title="Restore foreground">
            ${ICONS.keep}
            <span>Restore</span>
          </button>
          <button class="tool-btn" data-tool="eraser" id="tool-eraser" title="Clean eraser">
            ${ICONS.eraser}
            <span>Clean</span>
          </button>
          <button class="tool-btn" data-tool="wand" id="tool-wand" title="Magic Color Selector">
            ${ICONS.wand}
            <span>Magic</span>
          </button>
        </div>
      </div>

      <div class="tool-section">
        <div class="setting-row">
          <div class="setting-label">
            <span class="label">Brush Size</span>
            <span class="value" id="brush-size-val">25px</span>
          </div>
          <input type="range" class="slider" id="slider-brush-size" min="2" max="150" value="25" />
        </div>
      </div>

      <div class="tool-section">
        <div class="tool-buttons" style="gap:6px">
          <button class="btn btn-secondary btn-sm" id="btn-undo" style="flex:1" disabled title="Undo (Ctrl+Z)">
            ${ICONS.undo} Undo
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-redo" style="flex:1" disabled title="Redo (Ctrl+Y)">
            ${ICONS.redo} Redo
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-reset-mask" style="padding:0 8px" title="Reset to AI Cutout">
            Reset
          </button>
        </div>
      </div>

      <div class="tool-section" style="border-top:1px solid var(--color-border); padding-top:14px;">
        <div class="tool-section-title">Edge Refinements</div>
        <div class="setting-row">
          <div class="setting-label"><span class="label">Smoothness</span><span class="value" id="val-smooth">25</span></div>
          <input type="range" class="slider" id="slider-smooth" min="0" max="100" value="25" />
        </div>
        <div class="setting-row" style="margin-top:10px">
          <div class="setting-label"><span class="label">Feather (Softness)</span><span class="value" id="val-feather">10px</span></div>
          <input type="range" class="slider" id="slider-feather" min="0" max="40" value="10" />
        </div>
        <div class="setting-row" style="margin-top:10px">
          <div class="setting-label"><span class="label">Edge Contrast</span><span class="value" id="val-contrast">0</span></div>
          <input type="range" class="slider" id="slider-contrast" min="-100" max="100" value="0" />
        </div>
        <div class="setting-row" style="margin-top:10px">
          <div class="setting-label"><span class="label">Shift Edge</span><span class="value" id="val-shift">0px</span></div>
          <input type="range" class="slider" id="slider-shift" min="-20" max="20" value="0" />
        </div>
      </div>

      <div class="tool-section" style="border-top:1px solid var(--color-border); padding-top:10px;">
        <div class="setting-toggle-row">
          <span class="setting-toggle-label">Color Despill (Defringe)</span>
          <button class="toggle active" id="toggle-despill"></button>
        </div>
        <div class="setting-toggle-row">
          <span class="setting-toggle-label">Invert Mask</span>
          <button class="toggle" id="toggle-invert"></button>
        </div>
      </div>
    </div>

    <!-- 2. PHOTOSHOP ADJUSTMENTS TAB -->
    <div class="right-panel-body" id="pbody-adjust" style="display:none">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div class="tool-section-title" style="margin-bottom:0">Photoshop Color Grading</div>
        <button class="btn btn-ghost btn-sm" id="btn-reset-adjust" style="font-size:11px; padding:2px 6px;">Reset</button>
      </div>

      <div class="tool-section">
        <div class="tool-section-title" style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; opacity:0.8;">Light</div>
        <div class="setting-row">
          <div class="setting-label"><span class="label">Exposure</span><span class="value" id="val-exposure">0</span></div>
          <input type="range" class="slider" id="slider-exposure" min="-100" max="100" value="0" />
        </div>
        <div class="setting-row" style="margin-top:10px">
          <div class="setting-label"><span class="label">Brightness</span><span class="value" id="val-brightness">0</span></div>
          <input type="range" class="slider" id="slider-brightness" min="-100" max="100" value="0" />
        </div>
        <div class="setting-row" style="margin-top:10px">
          <div class="setting-label"><span class="label">Contrast</span><span class="value" id="val-contrast-adj">0</span></div>
          <input type="range" class="slider" id="slider-contrast-adj" min="-100" max="100" value="0" />
        </div>
      </div>

      <div class="tool-section" style="border-top:1px solid var(--color-border); padding-top:12px;">
        <div class="tool-section-title" style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; opacity:0.8;">Color</div>
        <div class="setting-row">
          <div class="setting-label"><span class="label">Temperature (WB)</span><span class="value" id="val-temperature">0</span></div>
          <input type="range" class="slider" id="slider-temperature" min="-100" max="100" value="0" />
        </div>
        <div class="setting-row" style="margin-top:10px">
          <div class="setting-label"><span class="label">Saturation</span><span class="value" id="val-saturation">0</span></div>
          <input type="range" class="slider" id="slider-saturation" min="-100" max="100" value="0" />
        </div>
        <div class="setting-row" style="margin-top:10px">
          <div class="setting-label"><span class="label">Vibrance</span><span class="value" id="val-vibrance">0</span></div>
          <input type="range" class="slider" id="slider-vibrance" min="-100" max="100" value="0" />
        </div>
        <div class="setting-row" style="margin-top:10px">
          <div class="setting-label"><span class="label">Hue Shift</span><span class="value" id="val-hue">0°</span></div>
          <input type="range" class="slider" id="slider-hue" min="-180" max="180" value="0" />
        </div>
      </div>

      <div class="tool-section" style="border-top:1px solid var(--color-border); padding-top:12px;">
        <div class="tool-section-title" style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; opacity:0.8;">Tone & Mood</div>
        <div class="setting-row">
          <div class="setting-label"><span class="label">Sepia</span><span class="value" id="val-sepia">0%</span></div>
          <input type="range" class="slider" id="slider-sepia" min="0" max="100" value="0" />
        </div>
        <div class="setting-toggle-row" style="margin-top:8px">
          <span class="setting-toggle-label">Monochrome (B&W)</span>
          <button class="toggle" id="toggle-grayscale"></button>
        </div>
        <div class="setting-toggle-row">
          <span class="setting-toggle-label">Invert Colors</span>
          <button class="toggle" id="toggle-invert-adj"></button>
        </div>
      </div>
    </div>

    <!-- 3. FILTER PRESETS TAB -->
    <div class="right-panel-body" id="pbody-filters" style="display:none">
      <div class="tool-section">
        <div class="tool-section-title">Instagram & Film Presets</div>
        <p style="font-size:12px; color:var(--color-text-secondary); margin-bottom:12px;">
          One-click cinema & photography color grades.
        </p>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px;" id="preset-grid">
          ${FILTER_PRESETS.map(preset => `
            <button class="format-btn ${preset.id === 'original' ? 'active' : ''}" data-preset="${preset.id}" style="padding: 10px 8px; text-align: left; display:flex; flex-direction:column; gap:4px;">
              <span style="font-weight:600; font-size:12px;">${preset.name}</span>
              <span style="font-size:10px; color:var(--color-text-secondary);">${preset.category}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- 4. LAYER STYLES / SUBJECT EFFECTS TAB -->
    <div class="right-panel-body" id="pbody-effects" style="display:none">
      <div class="tool-section">
        <div class="setting-toggle-row">
          <span class="setting-toggle-label" style="font-weight:600;">Sticker Outline / Stroke</span>
          <button class="toggle" id="toggle-stroke"></button>
        </div>
        <div id="stroke-settings" style="display:none; margin-top:8px;">
          <div class="setting-row">
            <div class="setting-label"><span class="label">Width</span><span class="value" id="val-stroke-w">6px</span></div>
            <input type="range" class="slider" id="slider-stroke-w" min="1" max="30" value="6" />
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
            <span style="font-size:12px;">Color:</span>
            <input type="color" id="stroke-color-picker" value="#ffffff" style="width:32px; height:24px; border:none; border-radius:4px; cursor:pointer;" />
          </div>
        </div>
      </div>

      <div class="tool-section" style="border-top:1px solid var(--color-border); padding-top:12px;">
        <div class="setting-toggle-row">
          <span class="setting-toggle-label" style="font-weight:600;">Photoshop Drop Shadow</span>
          <button class="toggle" id="toggle-shadow"></button>
        </div>
        <div id="shadow-settings" style="display:none; margin-top:8px;">
          <div class="setting-row">
            <div class="setting-label"><span class="label">Blur Radius</span><span class="value" id="val-shadow-blur">15px</span></div>
            <input type="range" class="slider" id="slider-shadow-blur" min="0" max="60" value="15" />
          </div>
          <div class="setting-row" style="margin-top:8px">
            <div class="setting-label"><span class="label">Offset Y</span><span class="value" id="val-shadow-offset-y">10px</span></div>
            <input type="range" class="slider" id="slider-shadow-offset-y" min="-40" max="40" value="10" />
          </div>
          <div class="setting-row" style="margin-top:8px">
            <div class="setting-label"><span class="label">Offset X</span><span class="value" id="val-shadow-offset-x">0px</span></div>
            <input type="range" class="slider" id="slider-shadow-offset-x" min="-40" max="40" value="0" />
          </div>
        </div>
      </div>

      <div class="tool-section" style="border-top:1px solid var(--color-border); padding-top:12px;">
        <div class="tool-section-title">Cinematic Lens Effects</div>
        <div class="setting-row">
          <div class="setting-label"><span class="label">Portrait Backdrop Blur</span><span class="value" id="val-bg-blur">0px</span></div>
          <input type="range" class="slider" id="slider-bg-blur" min="0" max="40" value="0" />
        </div>
        <div class="setting-row" style="margin-top:8px">
          <div class="setting-label"><span class="label">Vignette Depth</span><span class="value" id="val-vignette">0%</span></div>
          <input type="range" class="slider" id="slider-vignette" min="0" max="100" value="0" />
        </div>
      </div>
    </div>

    <!-- 5. BACKGROUND REPLACEMENT TAB -->
    <div class="right-panel-body" id="pbody-background" style="display:none">
      <div class="tool-section">
        <div class="tool-section-title">Solid Studio Colors</div>
        <div class="format-selector" style="grid-template-columns: repeat(4, 1fr); gap:8px;">
          <button class="format-btn active" data-bg="transparent" title="Transparent Checkerboard">
            <div style="width:24px;height:24px;background:repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50%/8px 8px;border-radius:4px;border:1px solid #cbd5e1"></div>
            <span style="font-size:11px">None</span>
          </button>
          <button class="format-btn" data-bg="#ffffff" title="Solid White">
            <div style="width:24px;height:24px;background:#ffffff;border:1px solid #cbd5e1;border-radius:4px"></div>
            <span style="font-size:11px">White</span>
          </button>
          <button class="format-btn" data-bg="#0f172a" title="Dark Slate">
            <div style="width:24px;height:24px;background:#0f172a;border-radius:4px"></div>
            <span style="font-size:11px">Slate</span>
          </button>
          <button class="format-btn" data-bg="#2563eb" title="Studio Blue">
            <div style="width:24px;height:24px;background:#2563eb;border-radius:4px"></div>
            <span style="font-size:11px">Blue</span>
          </button>
          <button class="format-btn" data-bg="#10b981" title="Mint Green">
            <div style="width:24px;height:24px;background:#10b981;border-radius:4px"></div>
            <span style="font-size:11px">Mint</span>
          </button>
          <button class="format-btn" data-bg="#f59e0b" title="Warm Amber">
            <div style="width:24px;height:24px;background:#f59e0b;border-radius:4px"></div>
            <span style="font-size:11px">Amber</span>
          </button>
          <button class="format-btn" data-bg="#ec4899" title="Rose Pink">
            <div style="width:24px;height:24px;background:#ec4899;border-radius:4px"></div>
            <span style="font-size:11px">Rose</span>
          </button>
          <button class="format-btn" data-bg="custom" id="bg-custom-btn" title="Pick Any Color">
            <input type="color" class="color-input" id="bg-color-picker" value="#3b82f6" style="width:24px;height:24px;border:none;padding:0;cursor:pointer;border-radius:4px;" />
            <span style="font-size:11px">Custom</span>
          </button>
        </div>
      </div>

      <div class="tool-section" style="margin-top:8px">
        <div class="tool-section-title">Studio Gradients</div>
        <div class="format-selector" style="grid-template-columns: repeat(3, 1fr); gap:8px;">
          <button class="format-btn" data-bg-grad="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <div style="width:100%;height:22px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:4px"></div>
            <span style="font-size:10px">Purple</span>
          </button>
          <button class="format-btn" data-bg-grad="linear-gradient(135deg, #ff0844 0%, #ffb199 100%)">
            <div style="width:100%;height:22px;background:linear-gradient(135deg, #ff0844 0%, #ffb199 100%);border-radius:4px"></div>
            <span style="font-size:10px">Sunset</span>
          </button>
          <button class="format-btn" data-bg-grad="linear-gradient(135deg, #0ba360 0%, #3cba92 100%)">
            <div style="width:100%;height:22px;background:linear-gradient(135deg, #0ba360 0%, #3cba92 100%);border-radius:4px"></div>
            <span style="font-size:10px">Emerald</span>
          </button>
          <button class="format-btn" data-bg-grad="linear-gradient(135deg, #2af598 0%, #009efd 100%)">
            <div style="width:100%;height:22px;background:linear-gradient(135deg, #2af598 0%, #009efd 100%);border-radius:4px"></div>
            <span style="font-size:10px">Sky</span>
          </button>
          <button class="format-btn" data-bg-grad="linear-gradient(135deg, #b1ea4d 0%, #459522 100%)">
            <div style="width:100%;height:22px;background:linear-gradient(135deg, #b1ea4d 0%, #459522 100%);border-radius:4px"></div>
            <span style="font-size:10px">Lime</span>
          </button>
          <button class="format-btn" data-bg-grad="linear-gradient(135deg, #232526 0%, #414345 100%)">
            <div style="width:100%;height:22px;background:linear-gradient(135deg, #232526 0%, #414345 100%);border-radius:4px"></div>
            <span style="font-size:10px">Titanium</span>
          </button>
        </div>
      </div>

      <div class="tool-section" style="margin-top:8px">
        <div class="tool-section-title">Custom Backdrop Image</div>
        <button class="btn btn-secondary" id="btn-custom-backdrop-upload" style="width:100%">
          ${ICONS.upload} Choose Backdrop Image
        </button>
        <input type="file" id="custom-backdrop-input" accept="image/*" style="display:none" />
      </div>
    </div>

    <!-- 6. EXPORT TAB -->
    <div class="right-panel-body" id="pbody-export" style="display:none">
      <div class="tool-section">
        <div class="tool-section-title">Export Format</div>
        <div class="format-selector">
          <button class="format-btn active" data-export-format="png">PNG (Transparent)</button>
          <button class="format-btn" data-export-format="webp">WebP (Optimized)</button>
          <button class="format-btn" data-export-format="jpeg">JPEG (Compressed)</button>
        </div>
      </div>
      <div class="tool-section">
        <div class="setting-row">
          <div class="setting-label">
            <span class="label">Quality</span>
            <span class="value" id="export-quality-value">95%</span>
          </div>
          <input type="range" class="slider" id="export-quality-slider" min="10" max="100" value="95" />
        </div>
      </div>
      <div class="tool-section" style="margin-top:16px">
        <button class="btn btn-primary btn-lg" id="panel-download-btn" style="width:100%">
          ${ICONS.download} Download Image
        </button>
      </div>
    </div>
  `;

  // Tab switching
  panel.querySelectorAll('.right-panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.right-panel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabId = (tab as HTMLElement).dataset.ptab;
      document.getElementById('pbody-retouch')!.style.display = tabId === 'retouch' ? 'flex' : 'none';
      document.getElementById('pbody-adjust')!.style.display = tabId === 'adjust' ? 'flex' : 'none';
      document.getElementById('pbody-filters')!.style.display = tabId === 'filters' ? 'flex' : 'none';
      document.getElementById('pbody-effects')!.style.display = tabId === 'effects' ? 'flex' : 'none';
      document.getElementById('pbody-background')!.style.display = tabId === 'background' ? 'flex' : 'none';
      document.getElementById('pbody-export')!.style.display = tabId === 'export' ? 'flex' : 'none';
    });
  });

  // Launch Full Photoshop Studio button
  panel.querySelector('#btn-launch-editor-top')?.addEventListener('click', () => {
    eventBus.emit('editor:launch', null);
  });

  // Retouch tool buttons
  panel.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      eventBus.emit('toolChange', (btn as HTMLElement).dataset.tool);
    });
  });

  // Brush slider
  setupSlider(panel, 'slider-brush-size', 'brush-size-val', 'px', (v) => eventBus.emit('brushSizeChange', v));

  // Edge refinement sliders
  setupSlider(panel, 'slider-smooth', 'val-smooth', '', (v) => eventBus.emit('refine:smooth', v));
  setupSlider(panel, 'slider-feather', 'val-feather', 'px', (v) => eventBus.emit('refine:feather', v));
  setupSlider(panel, 'slider-contrast', 'val-contrast', '', (v) => eventBus.emit('refine:contrast', v));
  setupSlider(panel, 'slider-shift', 'val-shift', 'px', (v) => eventBus.emit('refine:shiftEdge', v));

  // Despill & Invert toggles
  panel.querySelector('#toggle-despill')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement;
    btn.classList.toggle('active');
    eventBus.emit('refine:despill', btn.classList.contains('active'));
  });
  panel.querySelector('#toggle-invert')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement;
    btn.classList.toggle('active');
    eventBus.emit('refine:invert', btn.classList.contains('active'));
  });

  // Undo / Redo / Reset
  panel.querySelector('#btn-undo')?.addEventListener('click', () => eventBus.emit('action:undo', null));
  panel.querySelector('#btn-redo')?.addEventListener('click', () => eventBus.emit('action:redo', null));
  panel.querySelector('#btn-reset-mask')?.addEventListener('click', () => eventBus.emit('action:resetMask', null));

  // Adjustments (Light, Color, Tone)
  setupSlider(panel, 'slider-exposure', 'val-exposure', '', (v) => eventBus.emit('adjust:change', { exposure: v }));
  setupSlider(panel, 'slider-brightness', 'val-brightness', '', (v) => eventBus.emit('adjust:change', { brightness: v }));
  setupSlider(panel, 'slider-contrast-adj', 'val-contrast-adj', '', (v) => eventBus.emit('adjust:change', { contrast: v }));
  setupSlider(panel, 'slider-temperature', 'val-temperature', '', (v) => eventBus.emit('adjust:change', { temperature: v }));
  setupSlider(panel, 'slider-saturation', 'val-saturation', '', (v) => eventBus.emit('adjust:change', { saturation: v }));
  setupSlider(panel, 'slider-vibrance', 'val-vibrance', '', (v) => eventBus.emit('adjust:change', { vibrance: v }));
  setupSlider(panel, 'slider-hue', 'val-hue', '°', (v) => eventBus.emit('adjust:change', { hue: v }));
  setupSlider(panel, 'slider-sepia', 'val-sepia', '%', (v) => eventBus.emit('adjust:change', { sepia: v }));

  panel.querySelector('#toggle-grayscale')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement;
    btn.classList.toggle('active');
    eventBus.emit('adjust:change', { grayscale: btn.classList.contains('active') });
  });

  panel.querySelector('#toggle-invert-adj')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement;
    btn.classList.toggle('active');
    eventBus.emit('adjust:change', { invert: btn.classList.contains('active') });
  });

  panel.querySelector('#btn-reset-adjust')?.addEventListener('click', () => {
    // Reset slider UI
    ['slider-exposure', 'slider-brightness', 'slider-contrast-adj', 'slider-temperature', 'slider-saturation', 'slider-vibrance', 'slider-hue', 'slider-sepia'].forEach(id => {
      const el = panel.querySelector(`#${id}`) as HTMLInputElement;
      if (el) el.value = '0';
    });
    ['val-exposure', 'val-brightness', 'val-contrast-adj', 'val-temperature', 'val-saturation', 'val-vibrance'].forEach(id => {
      const el = panel.querySelector(`#${id}`);
      if (el) el.textContent = '0';
    });
    const hueEl = panel.querySelector('#val-hue');
    if (hueEl) hueEl.textContent = '0°';
    const sepEl = panel.querySelector('#val-sepia');
    if (sepEl) sepEl.textContent = '0%';
    panel.querySelector('#toggle-grayscale')?.classList.remove('active');
    panel.querySelector('#toggle-invert-adj')?.classList.remove('active');

    eventBus.emit('adjust:reset', null);
  });

  // Filter Presets
  panel.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presetId = (btn as HTMLElement).dataset.preset;
      const preset = FILTER_PRESETS.find(p => p.id === presetId);
      if (preset) {
        eventBus.emit('adjust:change', preset.adjustments);
      }
    });
  });

  // Styles & Effects (Outline, Shadow, Blur, Vignette)
  panel.querySelector('#toggle-stroke')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement;
    btn.classList.toggle('active');
    const enabled = btn.classList.contains('active');
    const settingsDiv = panel.querySelector('#stroke-settings') as HTMLElement;
    if (settingsDiv) settingsDiv.style.display = enabled ? 'block' : 'none';
    eventBus.emit('effects:change', { strokeEnabled: enabled });
  });

  setupSlider(panel, 'slider-stroke-w', 'val-stroke-w', 'px', (v) => eventBus.emit('effects:change', { strokeWidth: v }));

  panel.querySelector('#stroke-color-picker')?.addEventListener('input', (e) => {
    eventBus.emit('effects:change', { strokeColor: (e.target as HTMLInputElement).value });
  });

  panel.querySelector('#toggle-shadow')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement;
    btn.classList.toggle('active');
    const enabled = btn.classList.contains('active');
    const settingsDiv = panel.querySelector('#shadow-settings') as HTMLElement;
    if (settingsDiv) settingsDiv.style.display = enabled ? 'block' : 'none';
    eventBus.emit('effects:change', { shadowEnabled: enabled });
  });

  setupSlider(panel, 'slider-shadow-blur', 'val-shadow-blur', 'px', (v) => eventBus.emit('effects:change', { shadowBlur: v }));
  setupSlider(panel, 'slider-shadow-offset-y', 'val-shadow-offset-y', 'px', (v) => eventBus.emit('effects:change', { shadowOffsetY: v }));
  setupSlider(panel, 'slider-shadow-offset-x', 'val-shadow-offset-x', 'px', (v) => eventBus.emit('effects:change', { shadowOffsetX: v }));
  setupSlider(panel, 'slider-bg-blur', 'val-bg-blur', 'px', (v) => eventBus.emit('effects:change', { bgBlur: v }));
  setupSlider(panel, 'slider-vignette', 'val-vignette', '%', (v) => eventBus.emit('effects:change', { vignette: v }));

  // Solid background colors
  panel.querySelectorAll('[data-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-bg], [data-bg-grad]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const bg = (btn as HTMLElement).dataset.bg;
      if (bg === 'custom') {
        const color = (panel.querySelector('#bg-color-picker') as HTMLInputElement).value;
        eventBus.emit('backgroundChange', { type: 'color', value: color });
      } else {
        eventBus.emit('backgroundChange', { type: 'color', value: bg });
      }
    });
  });

  panel.querySelector('#bg-color-picker')?.addEventListener('input', (e) => {
    panel.querySelectorAll('[data-bg], [data-bg-grad]').forEach(b => b.classList.remove('active'));
    panel.querySelector('#bg-custom-btn')?.classList.add('active');
    eventBus.emit('backgroundChange', { type: 'color', value: (e.target as HTMLInputElement).value });
  });

  // Gradient backgrounds
  panel.querySelectorAll('[data-bg-grad]').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-bg], [data-bg-grad]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const grad = (btn as HTMLElement).dataset.bgGrad;
      eventBus.emit('backgroundChange', { type: 'gradient', value: grad });
    });
  });

  // Custom backdrop upload
  const customBgInput = panel.querySelector('#custom-backdrop-input') as HTMLInputElement;
  panel.querySelector('#btn-custom-backdrop-upload')?.addEventListener('click', () => {
    customBgInput.click();
  });

  customBgInput?.addEventListener('change', async () => {
    const file = customBgInput.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      panel.querySelectorAll('[data-bg], [data-bg-grad]').forEach(b => b.classList.remove('active'));
      eventBus.emit('backgroundChange', { type: 'image', value: img });
    };
    img.src = URL.createObjectURL(file);
  });

  // Export Settings
  panel.querySelectorAll('[data-export-format]').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-export-format]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const format = (btn as HTMLElement).dataset.exportFormat;
      eventBus.emit('exportFormatChange', format);
    });
  });

  const qualitySlider = panel.querySelector('#export-quality-slider') as HTMLInputElement;
  const qualityValue = panel.querySelector('#export-quality-value');
  qualitySlider?.addEventListener('input', () => {
    qualityValue!.textContent = `${qualitySlider.value}%`;
    eventBus.emit('exportQualityChange', parseInt(qualitySlider.value, 10));
  });

  panel.querySelector('#panel-download-btn')?.addEventListener('click', () => {
    eventBus.emit('downloadImage', null);
  });

  return panel;
}

function setupSlider(
  container: HTMLElement,
  sliderId: string,
  valueId: string,
  unit: string,
  onChange: (value: number) => void
): void {
  const slider = container.querySelector(`#${sliderId}`) as HTMLInputElement;
  const valueDisplay = container.querySelector(`#${valueId}`);
  if (!slider || !valueDisplay) return;

  slider.addEventListener('input', () => {
    valueDisplay.textContent = `${slider.value}${unit}`;
    onChange(parseFloat(slider.value));
  });
}

export function updateUndoRedoButtons(canUndo: boolean, canRedo: boolean): void {
  const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement | null;
  const redoBtn = document.getElementById('btn-redo') as HTMLButtonElement | null;
  if (undoBtn) undoBtn.disabled = !canUndo;
  if (redoBtn) redoBtn.disabled = !canRedo;
}
