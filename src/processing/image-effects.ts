export interface ImageAdjustments {
  brightness: number;   // -100 to 100 (0 = normal)
  contrast: number;     // -100 to 100 (0 = normal)
  saturation: number;   // -100 to 100 (0 = normal)
  temperature: number;  // -100 to 100 (0 = normal)
  exposure: number;     // -100 to 100 (0 = normal)
  hue: number;          // -180 to 180 (0 = normal)
  vibrance: number;     // -100 to 100 (0 = normal)
  sepia: number;        // 0 to 100
  grayscale: boolean;
  invert: boolean;
}

export interface SubjectEffects {
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;   // 1 to 30px
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;    // 0 to 50px
  shadowOffsetX: number; // -50 to 50px
  shadowOffsetY: number; // -50 to 50px
  shadowOpacity: number; // 0 to 100%
  bgBlur: number;        // 0 to 50px (blur original backdrop)
  vignette: number;      // 0 to 100%
}

export const defaultAdjustments: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  exposure: 0,
  hue: 0,
  vibrance: 0,
  sepia: 0,
  grayscale: false,
  invert: false,
};

export const defaultSubjectEffects: SubjectEffects = {
  strokeEnabled: false,
  strokeColor: '#ffffff',
  strokeWidth: 6,
  shadowEnabled: false,
  shadowColor: 'rgba(0, 0, 0, 0.6)',
  shadowBlur: 15,
  shadowOffsetX: 0,
  shadowOffsetY: 10,
  shadowOpacity: 60,
  bgBlur: 0,
  vignette: 0,
};

/**
 * Apply Photoshop-style color grading & adjustments directly onto ImageData
 */
export function applyAdjustments(
  srcImageData: ImageData,
  adj: ImageAdjustments
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(srcImageData.data),
    srcImageData.width,
    srcImageData.height
  );
  const data = output.data;
  const numPixels = data.length;

  const brightnessMul = 1 + adj.brightness / 100;
  const contrastFactor = (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));
  const exposureMul = Math.pow(2, adj.exposure / 50);
  const satFactor = 1 + adj.saturation / 100;
  const tempShift = adj.temperature;
  const sepiaFactor = adj.sepia / 100;
  const hueRad = (adj.hue * Math.PI) / 180;
  const cosHue = Math.cos(hueRad);
  const sinHue = Math.sin(hueRad);

  for (let i = 0; i < numPixels; i += 4) {
    let a = data[i + 3];
    if (a === 0) continue; // Skip fully transparent pixels

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure
    if (adj.exposure !== 0) {
      r *= exposureMul;
      g *= exposureMul;
      b *= exposureMul;
    }

    // 2. Brightness
    if (adj.brightness !== 0) {
      r *= brightnessMul;
      g *= brightnessMul;
      b *= brightnessMul;
    }

    // 3. Contrast
    if (adj.contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // 4. Temperature (White Balance)
    if (tempShift !== 0) {
      r += tempShift * 0.8;
      b -= tempShift * 0.8;
    }

    // 5. Saturation & Vibrance
    if (adj.saturation !== 0 || adj.vibrance !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      let curSat = satFactor;
      if (adj.vibrance !== 0) {
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const currentSat = (maxC - minC) / (maxC || 1);
        const vibFactor = (1 - currentSat) * (adj.vibrance / 100);
        curSat += vibFactor;
      }
      r = gray + (r - gray) * curSat;
      g = gray + (g - gray) * curSat;
      b = gray + (b - gray) * curSat;
    }

    // 6. Hue Shift
    if (adj.hue !== 0) {
      const u = r, v = g, w = b;
      r = (.299 + .701 * cosHue + .168 * sinHue) * u
        + (.587 - .587 * cosHue + .330 * sinHue) * v
        + (.114 - .114 * cosHue - .497 * sinHue) * w;
      g = (.299 - .299 * cosHue - .328 * sinHue) * u
        + (.587 + .413 * cosHue + .035 * sinHue) * v
        + (.114 - .114 * cosHue + .292 * sinHue) * w;
      b = (.299 - .300 * cosHue + 1.25 * sinHue) * u
        + (.587 - .588 * cosHue - 1.05 * sinHue) * v
        + (.114 + .886 * cosHue - .203 * sinHue) * w;
    }

    // 7. Sepia
    if (sepiaFactor > 0) {
      const sr = (r * 0.393) + (g * 0.769) + (b * 0.189);
      const sg = (r * 0.349) + (g * 0.686) + (b * 0.168);
      const sb = (r * 0.272) + (g * 0.534) + (b * 0.131);
      r = r * (1 - sepiaFactor) + sr * sepiaFactor;
      g = g * (1 - sepiaFactor) + sg * sepiaFactor;
      b = b * (1 - sepiaFactor) + sb * sepiaFactor;
    }

    // 8. Grayscale
    if (adj.grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray; g = gray; b = gray;
    }

    // 9. Invert
    if (adj.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  return output;
}

/**
 * Render cutout subject with Photoshop-style Stroke (Outline) and Drop Shadow
 */
export function renderSubjectWithEffects(
  canvas: HTMLCanvasElement,
  subjectImageData: ImageData,
  effects: SubjectEffects,
  bgData?: { type: string; value?: any; originalImg?: ImageData }
): void {
  const w = subjectImageData.width;
  const h = subjectImageData.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // 1. Draw Background (Solid, Gradient, Blurred Original, or Image)
  if (effects.bgBlur > 0 && bgData?.originalImg) {
    // Portrait Mode / Bokeh effect: draw blurred original background
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = w;
    bgCanvas.height = h;
    const bctx = bgCanvas.getContext('2d')!;
    bctx.putImageData(bgData.originalImg, 0, 0);

    ctx.save();
    ctx.filter = `blur(${effects.bgBlur}px)`;
    ctx.drawImage(bgCanvas, 0, 0);
    ctx.restore();
  } else if (bgData && bgData.type !== 'transparent') {
    if (bgData.type === 'color') {
      ctx.fillStyle = bgData.value || '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else if (bgData.type === 'gradient' && bgData.value) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      if (bgData.value.includes('#667eea')) {
        grad.addColorStop(0, '#667eea'); grad.addColorStop(1, '#764ba2');
      } else if (bgData.value.includes('#ff0844')) {
        grad.addColorStop(0, '#ff0844'); grad.addColorStop(1, '#ffb199');
      } else if (bgData.value.includes('#0ba360')) {
        grad.addColorStop(0, '#0ba360'); grad.addColorStop(1, '#3cba92');
      } else if (bgData.value.includes('#2af598')) {
        grad.addColorStop(0, '#2af598'); grad.addColorStop(1, '#009efd');
      } else {
        grad.addColorStop(0, '#232526'); grad.addColorStop(1, '#414345');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (bgData.type === 'image' && bgData.value) {
      ctx.drawImage(bgData.value, 0, 0, w, h);
    }
  }

  // Create temporary canvas for the subject
  const subjectCanvas = document.createElement('canvas');
  subjectCanvas.width = w;
  subjectCanvas.height = h;
  const sctx = subjectCanvas.getContext('2d')!;
  sctx.putImageData(subjectImageData, 0, 0);

  // 2. Drop Shadow Effect
  if (effects.shadowEnabled) {
    ctx.save();
    ctx.shadowColor = effects.shadowColor;
    ctx.shadowBlur = effects.shadowBlur;
    ctx.shadowOffsetX = effects.shadowOffsetX;
    ctx.shadowOffsetY = effects.shadowOffsetY;
    ctx.drawImage(subjectCanvas, 0, 0);
    ctx.restore();
  }

  // 3. Subject Outline / Sticker Stroke Effect
  if (effects.strokeEnabled && effects.strokeWidth > 0) {
    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.width = w;
    strokeCanvas.height = h;
    const stkCtx = strokeCanvas.getContext('2d')!;

    // Create silhouette of the cutout
    const rad = effects.strokeWidth;
    stkCtx.drawImage(subjectCanvas, 0, 0);
    stkCtx.globalCompositeOperation = 'source-in';
    stkCtx.fillStyle = effects.strokeColor;
    stkCtx.fillRect(0, 0, w, h);

    // Dilate/Stroke outer edge in 360 degrees
    ctx.save();
    const step = Math.max(1, Math.round(rad / 4));
    for (let r = step; r <= rad; r += step) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const dx = Math.cos(angle) * r;
        const dy = Math.sin(angle) * r;
        ctx.drawImage(strokeCanvas, dx, dy);
      }
    }
    ctx.restore();
  }

  // 4. Draw Main Subject Cutout
  ctx.drawImage(subjectCanvas, 0, 0);

  // 5. Vignette Effect
  if (effects.vignette > 0) {
    ctx.save();
    const vGrad = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.3,
      w / 2, h / 2, Math.max(w, h) * 0.7
    );
    const alpha = (effects.vignette / 100) * 0.85;
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, `rgba(0,0,0,${alpha})`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

export interface FilterPreset {
  id: string;
  name: string;
  category: string;
  adjustments: Partial<ImageAdjustments>;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'original',
    name: 'Original',
    category: 'Basic',
    adjustments: { ...defaultAdjustments },
  },
  {
    id: 'warm-vintage',
    name: 'Warm Vintage',
    category: 'Film',
    adjustments: { brightness: 5, contrast: 15, saturation: -12, temperature: 18, sepia: 20 },
  },
  {
    id: 'kodak-portra',
    name: 'Kodak Portra',
    category: 'Film',
    adjustments: { exposure: 6, contrast: 12, vibrance: 18, temperature: 10, brightness: 4 },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    category: 'Warm',
    adjustments: { exposure: 8, brightness: 6, temperature: 28, saturation: 15, contrast: 10 },
  },
  {
    id: 'cinematic-teal',
    name: 'Cinematic',
    category: 'Social',
    adjustments: { contrast: 22, saturation: -10, temperature: -12, exposure: -4, vibrance: 12 },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'Creative',
    adjustments: { contrast: 28, saturation: 45, hue: 15, exposure: 12, vibrance: 30 },
  },
  {
    id: 'emerald',
    name: 'Emerald Nature',
    category: 'Creative',
    adjustments: { contrast: 16, saturation: 22, temperature: -8, hue: -8, vibrance: 25 },
  },
  {
    id: 'studio-clean',
    name: 'Studio Clean',
    category: 'Portrait',
    adjustments: { brightness: 10, contrast: 18, vibrance: 22, exposure: 6, saturation: 8 },
  },
  {
    id: 'monochrome',
    name: 'Moody B&W',
    category: 'Basic',
    adjustments: { grayscale: true, contrast: 35, exposure: 6, brightness: 2 },
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    category: 'Warm',
    adjustments: { temperature: 32, saturation: 26, brightness: 6, exposure: 8, contrast: 14 },
  },
];

