import type { ProcessingSettings } from '../core/types';
import { removeBackgroundML, processBackgroundRemovalLegacy } from './background-remover';
import { encodeImage } from './image-encoder';

export async function processImage(
  imageData: ImageData,
  settings: ProcessingSettings,
  onProgress?: (progress: number, status?: string) => void
): Promise<{ processedData: Uint8ClampedArray; maskData: Uint8ClampedArray; width: number; height: number }> {
  await new Promise(r => setTimeout(r, 0));

  try {
    // Try ML-based removal first (much better quality)
    const result = await removeBackgroundML(imageData, onProgress);
    return {
      processedData: new Uint8ClampedArray(result.processed.data),
      maskData: result.mask,
      width: result.processed.width,
      height: result.processed.height,
    };
  } catch (err) {
    console.warn('ML model failed, falling back to color-based algorithm:', err);

    // Fallback to legacy algorithm
    const result = processBackgroundRemovalLegacy(imageData, {
      threshold: settings.threshold,
      edgeRefine: settings.edgeRefine,
      denoise: settings.denoise,
      feather: settings.feather,
      invertMask: settings.invertMask,
    }, (p) => onProgress?.(p, 'Processing (fallback)...'));

    return {
      processedData: new Uint8ClampedArray(result.processed.data),
      maskData: result.mask,
      width: result.processed.width,
      height: result.processed.height,
    };
  }
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
