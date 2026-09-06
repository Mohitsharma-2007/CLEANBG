import type { CompressionMode } from '../core/types';

/**
 * Compress image with quality control
 */
export async function compressImage(
  file: File,
  mode: CompressionMode,
  qualityLevel: number,
  outputFormat: string = 'auto',
  removeMetadata: boolean = true
): Promise<{ blob: Blob; savings: number }> {
  const img = await loadImg(file);

  // Determine quality based on mode
  let quality: number;
  switch (mode) {
    case 'smallest':
      quality = Math.max(0.3, (qualityLevel / 100) * 0.6);
      break;
    case 'quality':
      quality = Math.max(0.7, (qualityLevel / 100) * 0.95 + 0.05);
      break;
    default: // balanced
      quality = qualityLevel / 100;
  }

  // Determine output format
  let mimeType: string;
  if (outputFormat === 'auto') {
    // WebP usually gives the best compression
    mimeType = 'image/webp';
  } else {
    mimeType = `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  // For JPEG, fill with white background
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('Compression failed')),
      mimeType,
      quality
    );
  });

  const savings = Math.max(0, file.size - blob.size);
  return { blob, savings };
}

/**
 * Estimate compressed size without actually compressing
 */
export function estimateCompressedSize(
  originalSize: number,
  mode: CompressionMode,
  quality: number
): number {
  const ratios: Record<CompressionMode, number> = {
    smallest: 0.15,
    balanced: 0.35,
    quality: 0.65,
  };

  const modeRatio = ratios[mode];
  const qualityFactor = 0.5 + (quality / 100) * 0.5;
  return Math.round(originalSize * modeRatio * qualityFactor);
}

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}
