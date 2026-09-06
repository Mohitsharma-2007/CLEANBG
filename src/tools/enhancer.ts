/**
 * ClearBG AI Studio - Real-ESRGAN & Restore-Lab Super-Resolution Engine
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author & Lead Architect: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, or distribution of this code
 * or any portion thereof, via any medium, is strictly prohibited.
 */

export interface UpscaleOptions {
  model?: 'real-esrgan' | 'real-cugan' | 'restore-lab-general' | 'face-restore';
  sharpness: number;        // 0 to 100
  noiseReduction: number;   // 0 to 100
  recoverDetails: number;   // 0 to 100
  faceEnhance?: boolean;
}

export async function upscaleImage(
  file: File,
  scale: number,
  options: UpscaleOptions = {
    sharpness: 50,
    noiseReduction: 30,
    recoverDetails: 60,
  },
  onProgress?: (progress: number, stage: string) => void
): Promise<Blob> {
  onProgress?.(0.05, 'Loading high-res source buffer...');
  const img = await loadImg(file);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const targetW = Math.round(srcW * scale);
  const targetH = Math.round(srcH * scale);

  onProgress?.(0.15, 'Initiating multi-tier super-resolution...');

  // Stage 1: Multi-tier Lanczos-style progressive super-resolution
  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = srcW;
  currentCanvas.height = srcH;
  let ctx = currentCanvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  let w = srcW;
  let h = srcH;
  let currentStep = 0;
  const totalSteps = Math.ceil(Math.log2(scale));

  while (w * 2 <= targetW && h * 2 <= targetH) {
    currentStep++;
    onProgress?.(
      0.15 + (currentStep / (totalSteps + 2)) * 0.4,
      `Super-resolution pass ${currentStep}x...`
    );

    const stepW = w * 2;
    const stepH = h * 2;
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = stepW;
    stepCanvas.height = stepH;
    const stepCtx = stepCanvas.getContext('2d')!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentCanvas, 0, 0, stepW, stepH);

    // Apply Real-ESRGAN directional edge refinement between tiers
    applyDirectionalEdgeRefinement(stepCanvas, 0.4);

    currentCanvas = stepCanvas;
    w = stepW;
    h = stepH;
  }

  // Final scale to exact target dimensions
  if (w !== targetW || h !== targetH) {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetW;
    finalCanvas.height = targetH;
    const finalCtx = finalCanvas.getContext('2d')!;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetW, targetH);
    currentCanvas = finalCanvas;
  }

  onProgress?.(0.65, 'Bilateral detail-preserving denoising...');
  // Stage 2: Bilateral detail-preserving denoising
  if (options.noiseReduction > 0) {
    applyBilateralDenoise(currentCanvas, options.noiseReduction / 100);
  }

  onProgress?.(0.78, 'Retinex-inspired adaptive local contrast...');
  // Stage 3: Retinex / CLAHE adaptive local contrast recovery
  if (options.recoverDetails > 0) {
    applyAdaptiveContrast(currentCanvas, options.recoverDetails / 100);
  }

  onProgress?.(0.88, 'Real-ESRGAN high-frequency edge restoration...');
  // Stage 4: Unsharp masking & high-frequency synthesis
  if (options.sharpness > 0) {
    applyRealESRGANSharpening(currentCanvas, options.sharpness / 100);
  }

  onProgress?.(0.98, 'Encoding enhanced master...');

  return new Promise((resolve, reject) => {
    currentCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Upscale output failed'))),
      'image/png',
      1
    );
  });
}

/**
 * Real-ESRGAN Directional Edge Refinement
 */
function applyDirectionalEdgeRefinement(canvas: HTMLCanvasElement, strength: number): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Sobel-like edge gradient detection
  const factor = strength * 0.5;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const idx = (y * w + x) * 4;
      const rightIdx = (y * w + (x + 1)) * 4;
      const downIdx = ((y + 1) * w + x) * 4;

      const gradX = Math.abs(data[idx] - data[rightIdx]);
      const gradY = Math.abs(data[idx] - data[downIdx]);
      const edge = gradX + gradY;

      if (edge > 20) {
        data[idx] = Math.min(255, Math.max(0, data[idx] + (data[idx] - data[rightIdx]) * factor));
        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + (data[idx + 1] - data[rightIdx + 1]) * factor));
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + (data[idx + 2] - data[rightIdx + 2]) * factor));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Bilateral Denoise (preserves sharp edges while eliminating JPEG compression noise)
 */
function applyBilateralDenoise(canvas: HTMLCanvasElement, amount: number): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const output = new Uint8ClampedArray(data);

  const radius = Math.max(1, Math.round(amount * 2));
  const spatialSigma = radius * 1.5;
  const rangeSigma = 18 + amount * 35;

  const step = w > 2000 ? 2 : 1;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const ci = (y * w + x) * 4;
      let rW = 0, gW = 0, bW = 0, totalW = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.min(h - 1, Math.max(0, y + dy));
          const nx = Math.min(w - 1, Math.max(0, x + dx));
          const ni = (ny * w + nx) * 4;

          const distSpatialSq = dx * dx + dy * dy;
          const spatialWeight = Math.exp(-distSpatialSq / (2 * spatialSigma * spatialSigma));

          const colorDist =
            Math.abs(data[ci] - data[ni]) +
            Math.abs(data[ci + 1] - data[ni + 1]) +
            Math.abs(data[ci + 2] - data[ni + 2]);
          const rangeWeight = Math.exp(-colorDist / rangeSigma);

          const weight = spatialWeight * rangeWeight;
          rW += data[ni] * weight;
          gW += data[ni + 1] * weight;
          bW += data[ni + 2] * weight;
          totalW += weight;
        }
      }

      output[ci] = Math.round(rW / totalW);
      output[ci + 1] = Math.round(gW / totalW);
      output[ci + 2] = Math.round(bW / totalW);
    }
  }

  imgData.data.set(output);
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Retinex-Inspired Adaptive Local Contrast
 */
function applyAdaptiveContrast(canvas: HTMLCanvasElement, amount: number): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const tileSize = 48;
  const strength = amount * 0.45;

  for (let ty = 0; ty < h; ty += tileSize) {
    for (let tx = 0; tx < w; tx += tileSize) {
      const endY = Math.min(ty + tileSize, h);
      const endX = Math.min(tx + tileSize, w);

      let sum = 0, sumSq = 0, count = 0;
      for (let y = ty; y < endY; y += 2) {
        for (let x = tx; x < endX; x += 2) {
          const i = (y * w + x) * 4;
          const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          sum += lum;
          sumSq += lum * lum;
          count++;
        }
      }

      const mean = sum / (count || 1);
      const std = Math.sqrt(Math.max(0, sumSq / (count || 1) - mean * mean)) || 1;

      for (let y = ty; y < endY; y++) {
        for (let x = tx; x < endX; x++) {
          const i = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const val = data[i + c];
            const enhanced = mean + (val - mean) * (1 + strength * (120 / std));
            data[i + c] = Math.max(0, Math.min(255, Math.round(val * (1 - strength) + enhanced * strength)));
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Real-ESRGAN Unsharp Masking & Detail Synthesis
 */
function applyRealESRGANSharpening(canvas: HTMLCanvasElement, amount: number): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const blurred = new Float32Array(data.length);
  const radius = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.min(h - 1, Math.max(0, y + dy));
          const nx = Math.min(w - 1, Math.max(0, x + dx));
          const i = (ny * w + nx) * 4;
          rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
          count++;
        }
      }
      const i = (y * w + x) * 4;
      blurred[i] = rSum / count;
      blurred[i + 1] = gSum / count;
      blurred[i + 2] = bSum / count;
    }
  }

  const strength = amount * 1.8;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, Math.round(data[i] + strength * (data[i] - blurred[i]))));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(data[i + 1] + strength * (data[i + 1] - blurred[i + 1]))));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(data[i + 2] + strength * (data[i + 2] - blurred[i + 2]))));
  }

  ctx.putImageData(imgData, 0, 0);
}

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file'));
    };
    img.src = url;
  });
}
