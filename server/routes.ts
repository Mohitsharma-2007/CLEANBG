import { Router, Request, Response } from 'express';
import { pool } from './db';
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
    const result = await pool.query('SELECT NOW() as now, current_database() as db');
    res.json({
      status: 'ok',
      database: 'connected',
      currentDb: result.rows[0].db,
      serverTime: result.rows[0].now,
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// GET all history items (Filtered by user_id if logged in, or recent session)
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    let query = `
      SELECT id, user_id, name, tool, original_size, result_size, width, height, thumbnail, result_base64, settings, created_at 
      FROM history 
    `;
    const params: any[] = [];

    if (userId) {
      query += ` WHERE user_id = $1 `;
      params.push(userId);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    const items = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      tool: row.tool,
      originalSize: row.original_size,
      resultSize: row.result_size,
      width: row.width,
      height: row.height,
      thumbnail: row.thumbnail,
      resultBase64: row.result_base64,
      settings: row.settings,
      timestamp: new Date(row.created_at).getTime(),
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
      settings
    } = req.body;

    if (!id || !name || !tool || !resultBase64) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const query = `
      INSERT INTO history (id, user_id, name, tool, original_size, result_size, width, height, thumbnail, result_base64, settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, history.user_id),
        name = EXCLUDED.name,
        result_size = EXCLUDED.result_size,
        thumbnail = EXCLUDED.thumbnail,
        result_base64 = EXCLUDED.result_base64,
        settings = EXCLUDED.settings
      RETURNING id, user_id, created_at;
    `;

    const values = [
      id,
      userId,
      name,
      tool,
      originalSize || 0,
      resultSize || 0,
      width || 0,
      height || 0,
      thumbnail || '',
      resultBase64,
      JSON.stringify(settings || {})
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      createdAt: result.rows[0].created_at
    });
  } catch (err: any) {
    console.error('Error saving history item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single history item
router.delete('/history/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (userId) {
      await pool.query('DELETE FROM history WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)', [id, userId]);
    } else {
      await pool.query('DELETE FROM history WHERE id = $1', [id]);
    }

    res.json({ success: true, message: `Deleted item ${id}` });
  } catch (err: any) {
    console.error('Error deleting history item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE all history
router.delete('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await pool.query('DELETE FROM history WHERE user_id = $1', [userId]);
    } else {
      await pool.query('DELETE FROM history WHERE user_id IS NULL');
    }
    res.json({ success: true, message: 'History cleared' });
  } catch (err: any) {
    console.error('Error clearing history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
