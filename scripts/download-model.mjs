/**
 * ClearBG AI Studio - Server-Side Model Pre-Download Utility
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 */

import { AutoModel, AutoProcessor, env } from '@huggingface/transformers';
import path from 'path';
import fs from 'fs';

const CACHE_DIR = process.env.VERCEL
  ? '/tmp/huggingface'
  : path.join(process.cwd(), '.cache', 'huggingface');

env.cacheDir = CACHE_DIR;
env.allowLocalModels = false;

const MODEL_ID = 'briaai/RMBG-1.4';

async function main() {
  console.log('====================================================');
  console.log('🧠 Downloading & Verifying RMBG-1.4 Neural Model...');
  console.log(`📂 Cache Directory: ${CACHE_DIR}`);
  console.log('====================================================');

  const t0 = Date.now();

  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    console.log('1/2 Downloading RMBG-1.4 Image Processor...');
    await AutoProcessor.from_pretrained(MODEL_ID, {
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
      },
    });
    console.log('✓ Image Processor downloaded & verified.');

    console.log('2/2 Downloading Quantized RMBG-1.4 ONNX Model (q8)...');
    await AutoModel.from_pretrained(MODEL_ID, {
      config: { model_type: 'custom' },
      dtype: 'q8',
    });
    console.log('✓ Quantized Neural Network Model downloaded & verified.');

    console.log(`🎉 Model is 100% ready for server-side inference in ${((Date.now() - t0) / 1000).toFixed(2)}s!`);
  } catch (err) {
    console.error('❌ Failed to download model:', err);
    process.exit(1);
  }
}

main();
