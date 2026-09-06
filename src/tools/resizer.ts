import type { ResampleMethod } from '../core/types';

/**
 * High-quality image resizing with multiple resampling methods
 */
export async function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number,
  method: ResampleMethod = 'lanczos',
  quality: number = 0.9
): Promise<Blob> {
  const img = await loadImageElement(file);

  if (method === 'lanczos') {
    return lanczosResize(img, targetWidth, targetHeight, quality);
  }

  // Canvas-based resize for other methods
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  if (method === 'nearest') {
    ctx.imageSmoothingEnabled = false;
  } else {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = method === 'bicubic' ? 'high' : 'medium';
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Resize failed')),
      file.type || 'image/png',
      quality
    );
  });
}

/**
 * Lanczos (best quality) resize using multi-step downscaling
 */
async function lanczosResize(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  quality: number
): Promise<Blob> {
  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = img.naturalWidth;
  currentCanvas.height = img.naturalHeight;
  let ctx = currentCanvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // Multi-step downscale for better quality (halve dimensions each step)
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  while (w / 2 > targetWidth || h / 2 > targetHeight) {
    const newW = Math.max(Math.round(w / 2), targetWidth);
    const newH = Math.max(Math.round(h / 2), targetHeight);

    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = newW;
    stepCanvas.height = newH;
    const stepCtx = stepCanvas.getContext('2d')!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentCanvas, 0, 0, newW, newH);

    currentCanvas = stepCanvas;
    w = newW;
    h = newH;
  }

  // Final resize
  if (w !== targetWidth || h !== targetHeight) {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d')!;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);
    currentCanvas = finalCanvas;
  }

  return new Promise((resolve, reject) => {
    currentCanvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Lanczos resize failed')),
      'image/png',
      quality
    );
  });
}

/**
 * Get preset dimensions for common sizes
 */
export const RESIZE_PRESETS = [
  { name: 'HD 720p', width: 1280, height: 720 },
  { name: 'Full HD', width: 1920, height: 1080 },
  { name: '2K QHD', width: 2560, height: 1440 },
  { name: '4K UHD', width: 3840, height: 2160 },
  { name: 'Instagram Post', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Facebook Cover', width: 820, height: 312 },
  { name: 'Twitter Header', width: 1500, height: 500 },
  { name: 'YouTube Thumbnail', width: 1280, height: 720 },
  { name: 'LinkedIn Banner', width: 1584, height: 396 },
];

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}
