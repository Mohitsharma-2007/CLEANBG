/**
 * ClearBG AI Studio - Deep Learning RMBG-1.4 Background Remover
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author & Lead Architect: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, or distribution of this code
 * or any portion thereof, via any medium, is strictly prohibited.
 */

import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
} from '@huggingface/transformers';

type ProgressCallback = (progress: number, status?: string) => void;

// Configure Transformers.js environment for browser execution
env.allowLocalModels = false;

const MODEL_ID = 'briaai/RMBG-1.4';

let modelInstance: any = null;
let processorInstance: any = null;
let isInitializing = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Initialize the RMBG-1.4 model and processor (from addyosmani/bg-remove architecture)
 */
async function getModelAndProcessor(onProgress?: ProgressCallback): Promise<{ model: any; processor: any }> {
  if (modelInstance && processorInstance) {
    return { model: modelInstance, processor: processorInstance };
  }

  if (isInitializing && initPromise) {
    await initPromise;
    return { model: modelInstance, processor: processorInstance };
  }

  isInitializing = true;
  initPromise = (async () => {
    onProgress?.(0.05, 'Loading RMBG-1.4 neural network...');

    // Try WebGPU if available, fallback to WASM
    const hasWebGPU = typeof navigator !== 'undefined' && Boolean((navigator as any).gpu);
    let device: 'webgpu' | 'wasm' = 'wasm';

    if (hasWebGPU) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          device = 'webgpu';
        }
      } catch (e) {
        device = 'wasm';
      }
    }

    if (device === 'wasm' && env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = true;
    }

    try {
      modelInstance = await AutoModel.from_pretrained(MODEL_ID, {
        device,
        config: { model_type: 'custom' } as any,
        progress_callback: (item: any) => {
          if (item?.status === 'progress' && item?.progress != null) {
            const p = 0.05 + (item.progress / 100) * 0.45;
            onProgress?.(p, `Downloading RMBG-1.4 (${Math.round(item.progress)}%)...`);
          } else if (item?.status === 'ready') {
            onProgress?.(0.5, 'RMBG-1.4 model loaded');
          }
        },
      });

      processorInstance = await AutoProcessor.from_pretrained(MODEL_ID, {
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: 'ImageFeatureExtractor',
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
        } as any,
      });

      return true;
    } catch (err) {
      console.error('Failed to load RMBG-1.4 model:', err);
      modelInstance = null;
      processorInstance = null;
      throw err;
    } finally {
      isInitializing = false;
    }
  })();

  await initPromise;
  return { model: modelInstance, processor: processorInstance };
}

/**
 * State-of-the-Art background removal using briaai/RMBG-1.4 (addyosmani/bg-remove)
 */
export async function removeBackgroundML(
  imageData: ImageData,
  onProgress?: ProgressCallback
): Promise<{ processed: ImageData; mask: Uint8ClampedArray }> {
  const origW = imageData.width;
  const origH = imageData.height;

  onProgress?.(0.02, 'Preparing image for RMBG-1.4 AI...');

  // Convert input ImageData to temporary Canvas & Blob URL for RawImage
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = origW;
  tempCanvas.height = origH;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  const dataUrl = tempCanvas.toDataURL('image/png');
  const rawImg = await RawImage.fromURL(dataUrl);

  try {
    const { model, processor } = await getModelAndProcessor(onProgress);

    onProgress?.(0.55, 'Preprocessing image tensor...');
    const { pixel_values } = await processor(rawImg);

    onProgress?.(0.70, 'AI Segmenting foreground (RMBG-1.4)...');
    const { output } = await model({ input: pixel_values });

    onProgress?.(0.85, 'Extracting ultra-fine alpha matte...');

    // Resize mask back to original image dimensions
    const maskTensor = output[0].mul(255).to('uint8');
    const rawMask = await RawImage.fromTensor(maskTensor);
    const resizedMask = await rawMask.resize(origW, origH);
    const maskBytes = resizedMask.data; // Uint8Array [origW * origH]

    // Form final cutout ImageData
    const processedCanvas = document.createElement('canvas');
    processedCanvas.width = origW;
    processedCanvas.height = origH;
    const pCtx = processedCanvas.getContext('2d')!;
    pCtx.drawImage(tempCanvas, 0, 0);

    const processedImageData = pCtx.getImageData(0, 0, origW, origH);
    const pData = processedImageData.data;
    const finalMask = new Uint8ClampedArray(origW * origH);

    for (let i = 0; i < finalMask.length; i++) {
      const alpha = maskBytes[i];
      finalMask[i] = alpha;
      pData[i * 4 + 3] = alpha;
    }

    onProgress?.(1.0, 'Background removed with precision!');
    return {
      processed: processedImageData,
      mask: finalMask,
    };
  } catch (err: any) {
    console.warn('[RMBG-1.4] Inference failed, falling back to edge-guided algorithm:', err);
    onProgress?.(0.3, 'Switching to color-aware edge segmentation...');

    return processBackgroundRemovalLegacy(
      imageData,
      {
        threshold: 30,
        edgeRefine: true,
        denoise: true,
        feather: 2,
        invertMask: false,
      },
      (p) => onProgress?.(0.3 + p * 0.7, 'Color-edge matting...')
    );
  }
}

/**
 * Apply alpha mask to create transparent background
 */
export function applyMaskToImage(
  imageData: ImageData,
  mask: Uint8ClampedArray,
  invert: boolean = false
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const data = result.data;

  for (let i = 0; i < mask.length; i++) {
    let alpha = mask[i];
    if (invert) alpha = 255 - alpha;
    data[i * 4 + 3] = alpha;
  }

  return result;
}

/**
 * Apply manual brush stroke to mask
 */
export function applyBrushStroke(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  points: { x: number; y: number }[],
  brushSize: number,
  value: number
): void {
  for (const point of points) {
    const radius = brushSize / 2;
    const x0 = Math.max(0, Math.floor(point.x - radius));
    const y0 = Math.max(0, Math.floor(point.y - radius));
    const x1 = Math.min(width - 1, Math.ceil(point.x + radius));
    const y1 = Math.min(height - 1, Math.ceil(point.y + radius));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - point.x;
        const dy = y - point.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const t = 1 - (dist / radius);
          const falloff = t * t * (3 - 2 * t); // smoothstep
          const idx = y * width + x;
          if (value === 0) {
            mask[idx] = Math.max(0, Math.round(mask[idx] * (1 - falloff)));
          } else {
            mask[idx] = Math.min(255, Math.round(mask[idx] + (255 - mask[idx]) * falloff));
          }
        }
      }
    }
  }
}

// ============================================
// Fallback: Color-based algorithm
// ============================================

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  rr *= 100; gg *= 100; bb *= 100;
  const x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 95.047;
  const y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750) / 100.000;
  const z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 108.883;
  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function processBackgroundRemovalLegacy(
  imageData: ImageData,
  settings: {
    threshold: number;
    edgeRefine: boolean;
    denoise: boolean;
    feather: number;
    invertMask: boolean;
  },
  onProgress?: (progress: number) => void
): { processed: ImageData; mask: Uint8ClampedArray } {
  const { width, height, data } = imageData;

  onProgress?.(0.1);

  // Sample background color from borders
  const counts = new Map<string, { count: number; r: number; g: number; b: number }>();
  const edgeSize = 8;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= edgeSize && x < width - edgeSize && y >= edgeSize && y < height - edgeSize) continue;
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const key = `${Math.round(r / 8) * 8},${Math.round(g / 8) * 8},${Math.round(b / 8) * 8}`;
      const existing = counts.get(key);
      if (existing) { existing.count++; existing.r += r; existing.g += g; existing.b += b; }
      else counts.set(key, { count: 1, r, g, b });
    }
  }

  let maxCount = 0, dominant = { r: 0, g: 0, b: 0 };
  counts.forEach(v => {
    if (v.count > maxCount) {
      maxCount = v.count;
      dominant = { r: v.r / v.count, g: v.g / v.count, b: v.b / v.count };
    }
  });

  const [bgL, bgA, bgBv] = rgbToLab(dominant.r, dominant.g, dominant.b);
  onProgress?.(0.4);

  const mask = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [L, a, bVal] = rgbToLab(data[idx], data[idx + 1], data[idx + 2]);
      const dL = L - bgL, dA = a - bgA, dB = bVal - bgBv;
      const dist = Math.sqrt(dL * dL + dA * dA + dB * dB);
      if (dist < settings.threshold) mask[y * width + x] = 0;
      else if (dist < settings.threshold + settings.feather * 3) {
        const t = (dist - settings.threshold) / (settings.feather * 3);
        mask[y * width + x] = Math.round(t * 255);
      } else mask[y * width + x] = 255;
    }
  }

  onProgress?.(0.7);

  // Flood fill from borders
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let x = 0; x < width; x++) { queue.push(x); queue.push((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { queue.push(y * width); queue.push(y * width + width - 1); }
  while (queue.length > 0) {
    const pos = queue.pop()!;
    if (visited[pos]) continue;
    visited[pos] = 1;
    if (mask[pos] > 128) continue;
    mask[pos] = 0;
    const x = pos % width, y = (pos - x) / width;
    if (x > 0 && !visited[pos - 1]) queue.push(pos - 1);
    if (x < width - 1 && !visited[pos + 1]) queue.push(pos + 1);
    if (y > 0 && !visited[pos - width]) queue.push(pos - width);
    if (y < height - 1 && !visited[pos + width]) queue.push(pos + width);
  }

  onProgress?.(0.9);

  const processed = applyMaskToImage(imageData, mask, settings.invertMask);
  onProgress?.(1);
  return { processed, mask };
}
