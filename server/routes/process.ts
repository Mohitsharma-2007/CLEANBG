/**
 * ClearBG AI Studio - Server-Side Image Processing Routes
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author & Lead Architect: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, or distribution of this code
 * or any portion thereof, via any medium, is strictly prohibited.
 */

import { Router, Request, Response } from 'express';
import { removeBackgroundServer, getServerModelAndProcessor } from '../services/background-remover';

export const processRouter = Router();

/**
 * POST /api/process/remove-bg
 * High-performance neural network background removal on the server
 */
processRouter.post('/remove-bg', async (req: Request, res: Response) => {
  try {
    const { image, imageBase64 } = req.body;
    const input = image || imageBase64;

    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "image" or "imageBase64" (base64 string or data URL).',
      });
    }

    const result = await removeBackgroundServer(input);
    res.json(result);
  } catch (err: any) {
    console.error('[Process Route] Error removing background on server:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server-side background removal failed.',
    });
  }
});

/**
 * POST /api/process/preload
 * Preload and warm up the RMBG-1.4 model on the server
 */
processRouter.post('/preload', async (req: Request, res: Response) => {
  try {
    const t0 = Date.now();
    await getServerModelAndProcessor();
    res.json({
      success: true,
      message: 'RMBG-1.4 model is loaded and ready on server.',
      durationMs: Date.now() - t0,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to preload model.',
    });
  }
});

/**
 * GET /api/process/status
 * Check server AI engine status
 */
processRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine: 'RMBG-1.4 Neural Network',
    platform: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Local Server',
    maxInputSize: '50MB',
  });
});
