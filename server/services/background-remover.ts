/**
 * ClearBG AI Studio - Server-Side Deep Learning Background Remover (RMBG-1.4)
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author & Lead Architect: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, or distribution of this code
 * or any portion thereof, via any medium, is strictly prohibited.
 */

import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Configure cache directory for HuggingFace models
// On Vercel Serverless, only /tmp is writable
const CACHE_DIR = process.env.VERCEL
  ? '/tmp/huggingface'
  : path.join(process.cwd(), '.cache', 'huggingface');

env.cacheDir = CACHE_DIR;
env.allowLocalModels = false;

// Quantized RMBG-1.4 (briaai/RMBG-1.4)
const MODEL_ID = 'briaai/RMBG-1.4';

let modelInstance: any = null;
let processorInstance: any = null;
let isInitializing = false;
let initPromise: Promise<{ model: any; processor: any }> | null = null;

/**
 * Initialize or get cached RMBG-1.4 model and processor on the server
 */
export async function getServerModelAndProcessor(): Promise<{ model: any; processor: any }> {
  if (modelInstance && processorInstance) {
    return { model: modelInstance, processor: processorInstance };
  }

  if (isInitializing && initPromise) {
    return await initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log(`[AI Server] Loading RMBG-1.4 neural network into ${CACHE_DIR}...`);
      const t0 = Date.now();

      // Ensure cache directory exists
      try {
        if (!fs.existsSync(CACHE_DIR)) {
          fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
      } catch (e) {
        // Ignore if /tmp already managed
      }

      // Load processor
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

      // Load quantized neural network model (q8: ~42MB, fast inference on CPU)
      modelInstance = await AutoModel.from_pretrained(MODEL_ID, {
        config: { model_type: 'custom' } as any,
        dtype: 'q8',
      });

      console.log(`[AI Server] RMBG-1.4 model & processor loaded successfully in ${Date.now() - t0}ms!`);
      return { model: modelInstance, processor: processorInstance };
    } catch (err: any) {
      console.error('[AI Server] Failed to load RMBG-1.4 on server:', err);
      modelInstance = null;
      processorInstance = null;
      throw err;
    } finally {
      isInitializing = false;
    }
  })();

  return await initPromise;
}

export interface ServerRemoveBgResult {
  success: boolean;
  cutoutDataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
  durationMs: number;
  engine: string;
}

/**
 * Remove background from image on server side
 * @param imageInput Base64 data URL, base64 string, or raw Buffer
 */
export async function removeBackgroundServer(
  imageInput: string | Buffer
): Promise<ServerRemoveBgResult> {
  const t0 = Date.now();

  // 1. Convert input to Buffer
  let inputBuffer: Buffer;
  if (Buffer.isBuffer(imageInput)) {
    inputBuffer = imageInput;
  } else if (typeof imageInput === 'string') {
    // Strip data URL prefix if present (e.g. data:image/png;base64,...)
    const base64Clean = imageInput.replace(/^data:image\/\w+;base64,/, '');
    inputBuffer = Buffer.from(base64Clean, 'base64');
  } else {
    throw new Error('Invalid image input format. Expected base64 string or Buffer.');
  }

  // 2. Extract metadata and raw RGB/RGBA using Sharp
  const sharpImg = sharp(inputBuffer);
  const meta = await sharpImg.metadata();
  const width = meta.width;
  const height = meta.height;

  if (!width || !height) {
    throw new Error('Unable to determine image dimensions');
  }

  // 3. Load model and processor
  const { model, processor } = await getServerModelAndProcessor();

  // 4. Create RawImage for HuggingFace Transformers
  const blob = new Blob([inputBuffer]);
  const rawImg = await RawImage.fromBlob(blob);

  // 5. Preprocess and run RMBG-1.4 segmentation
  const { pixel_values } = await processor(rawImg);
  const { output } = await model({ input: pixel_values });

  // 6. Extract raw 1024x1024 alpha mask tensor
  const maskTensor = output[0].mul(255).to('uint8');
  const mask1024Buf = Buffer.from(maskTensor.data);

  // 7. High-speed, high-precision Lanczos3 resizing of mask to original image dimensions using Sharp
  const resizedMaskBuf = await sharp(mask1024Buf, {
    raw: { width: 1024, height: 1024, channels: 1 },
  })
    .resize(width, height, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();

  // 8. Extract RGB buffer from original image
  const rgbBuffer = await sharp(inputBuffer).removeAlpha().toBuffer();

  // 9. Attach the precision alpha mask to the image using Sharp joinChannel
  const pngCutoutBuffer = await sharp(rgbBuffer)
    .joinChannel(resizedMaskBuf, {
      raw: { width, height, channels: 1 },
    })
    .png({ compressionLevel: 8 })
    .toBuffer();

  const durationMs = Date.now() - t0;
  const cutoutDataUrl = `data:image/png;base64,${pngCutoutBuffer.toString('base64')}`;

  return {
    success: true,
    cutoutDataUrl,
    width,
    height,
    originalSize: inputBuffer.length,
    processedSize: pngCutoutBuffer.length,
    durationMs,
    engine: 'RMBG-1.4 (Server-Side)',
  };
}
