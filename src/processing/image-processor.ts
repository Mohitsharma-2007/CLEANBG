/**
 * ClearBG AI Studio - Image Processor Pipeline
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author & Lead Architect: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, or distribution of this code
 * or any portion thereof, via any medium, is strictly prohibited.
 */

import type { ProcessingSettings } from '../core/types';
import { removeBackgroundML, processBackgroundRemovalLegacy } from './background-remover';
import { encodeImage } from './image-encoder';

/**
 * Convert ImageData to base64 Data URL for server transmission
 */
function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Decode base64 cutout PNG data URL back into ImageData and alpha mask
 */
function dataUrlToImageData(dataUrl: string): Promise<{ processed: ImageData; mask: Uint8ClampedArray }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const mask = new Uint8ClampedArray(w * h);
      for (let i = 0; i < mask.length; i++) {
        mask[i] = data[i * 4 + 3];
      }
      resolve({ processed: imgData, mask });
    };
    img.onerror = (e) => reject(new Error('Failed to decode server cutout image'));
    img.src = dataUrl;
  });
}

/**
 * Execute background removal on Server Side (Vercel / Node backend)
 */
export async function removeBackgroundViaServer(
  imageData: ImageData,
  onProgress?: (progress: number, status?: string) => void
): Promise<{ processed: ImageData; mask: Uint8ClampedArray }> {
  onProgress?.(0.1, 'Encoding photo for Server AI...');
  const dataUrl = imageDataToDataUrl(imageData);

  onProgress?.(0.25, 'Sending photo to AI Server (RMBG-1.4)...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('/api/process/remove-bg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: dataUrl }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Server returned error status ${response.status}`);
    }

    onProgress?.(0.75, 'Receiving high-precision neural cutout from server...');
    const result = await response.json();

    if (!result.success || !result.cutoutDataUrl) {
      throw new Error(result.error || 'Server did not return cutout image');
    }

    onProgress?.(0.9, 'Finalizing neural cutout on canvas...');
    return await dataUrlToImageData(result.cutoutDataUrl);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Process image with server-side AI priority, falling back to client ML and color algorithm
 */
export async function processImage(
  imageData: ImageData,
  settings: ProcessingSettings,
  onProgress?: (progress: number, status?: string) => void
): Promise<{ processedData: Uint8ClampedArray; maskData: Uint8ClampedArray; width: number; height: number }> {
  await new Promise(r => setTimeout(r, 0));

  // 1. Primary Strategy: Server-Side AI (RMBG-1.4 on Vercel / Node backend)
  try {
    onProgress?.(0.05, 'Connecting to Server-Side AI engine...');
    const result = await removeBackgroundViaServer(imageData, onProgress);
    return {
      processedData: new Uint8ClampedArray(result.processed.data),
      maskData: result.mask,
      width: result.processed.width,
      height: result.processed.height,
    };
  } catch (serverErr: any) {
    console.warn('[ImageProcessor] Server-side processing failed or unavailable, falling back to local client ML:', serverErr);
  }

  // 2. Secondary Strategy: Client-Side WebAssembly ML (RMBG-1.4)
  try {
    onProgress?.(0.05, 'Running local AI neural network (briaai/RMBG-1.4)...');
    const result = await removeBackgroundML(imageData, onProgress);
    return {
      processedData: new Uint8ClampedArray(result.processed.data),
      maskData: result.mask,
      width: result.processed.width,
      height: result.processed.height,
    };
  } catch (mlErr: any) {
    console.warn('[ImageProcessor] Local ML model failed, falling back to color-based algorithm:', mlErr);
  }

  // 3. Tertiary Strategy: High-speed color-based legacy algorithm
  const result = processBackgroundRemovalLegacy(imageData, {
    threshold: settings.threshold,
    edgeRefine: settings.edgeRefine,
    denoise: settings.denoise,
    feather: settings.feather,
    invertMask: settings.invertMask,
  }, (p) => onProgress?.(p, 'Processing with color threshold fallback...'));

  return {
    processedData: new Uint8ClampedArray(result.processed.data),
    maskData: result.mask,
    width: result.processed.width,
    height: result.processed.height,
  };
}

export async function encodeImageAsync(
  imageData: ImageData,
  format: string,
  quality: number
): Promise<{ buffer: Uint8Array; format: string; size: number }> {
  await new Promise(r => setTimeout(r, 0));

  const blob = await encodeImage(imageData, format as any, quality);
  const buf = await blob.arrayBuffer();

  return {
    buffer: new Uint8Array(buf),
    format,
    size: buf.byteLength,
  };
}
