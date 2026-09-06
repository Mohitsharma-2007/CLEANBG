/**
 * ClearBG AI Studio - Main API Routes (MongoDB Atlas)
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import { Router, Request, Response } from 'express';
import { connectToDatabase, mongoose } from './db';
import { History } from './models/History';
import { authRouter } from './routes/auth';
import { optionalAuthMiddleware, AuthenticatedRequest } from './services/auth';

export const router = Router();

// Mount Auth Sub-router
router.use('/auth', authRouter);

// Apply optional auth to all API routes
router.use(optionalAuthMiddleware);

// Health Check
router.get('/health', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const state = mongoose.connection.readyState;
    const isConnected = state === 1;

    res.json({
      status: isConnected ? 'ok' : 'connecting',
      database: isConnected ? 'connected' : 'disconnected',
      engine: 'MongoDB Atlas',
      cluster: mongoose.connection.host || 'remote',
      currentDb: mongoose.connection.name || 'cleanbg',
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      engine: 'MongoDB Atlas',
      error: err.message,
    });
  }
});

// GET all history items (Filtered by user_id if logged in, or recent session)
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await connectToDatabase();
    const userId = req.user?.id;
    const filter: any = {};

    if (userId) {
      filter.userId = userId;
    }

    const docs = await History.find(filter).sort({ createdAt: -1 }).limit(100);

    const items = docs.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      tool: row.tool,
      originalSize: row.originalSize,
      resultSize: row.resultSize,
      width: row.width,
      height: row.height,
      thumbnail: row.thumbnail,
      resultBase64: row.resultBase64,
      settings: row.settings,
      timestamp: new Date(row.createdAt).getTime(),
    }));

    res.json({ success: true, count: items.length, data: items, userId: userId || 'guest' });
  } catch (err: any) {
    console.error('Error fetching history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save history item (Associated with user_id if logged in)
router.post('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await connectToDatabase();
    const userId = req.user?.id || null;
    const {
      id,
      name,
      tool,
      originalSize,
      resultSize,
      width,
      height,
      thumbnail,
      resultBase64,
      settings,
    } = req.body;

    if (!id || !name || !tool || !resultBase64) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const updated = await History.findOneAndUpdate(
      { id },
      {
        $set: {
          name,
          tool,
          originalSize: originalSize || 0,
          resultSize: resultSize || 0,
          width: width || 0,
          height: height || 0,
          thumbnail: thumbnail || '',
          resultBase64,
          settings: settings || {},
        },
        $setOnInsert: {
          id,
          userId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      id: updated.id,
      userId: updated.userId,
      createdAt: updated.createdAt,
    });
  } catch (err: any) {
    console.error('Error saving history item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single history item
router.delete('/history/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const userId = req.user?.id;

    const query: any = { id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }];
    }

    await History.deleteOne(query);
    res.json({ success: true, message: `Deleted item ${id}` });
  } catch (err: any) {
    console.error('Error deleting history item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE all history
router.delete('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await connectToDatabase();
    const userId = req.user?.id;
    if (userId) {
      await History.deleteMany({ userId });
    } else {
      await History.deleteMany({ userId: null });
    }
    res.json({ success: true, message: 'History cleared' });
  } catch (err: any) {
    console.error('Error clearing history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
