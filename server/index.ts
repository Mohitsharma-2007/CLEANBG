/**
 * ClearBG AI Studio - Backend Server
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author & Lead Architect: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, or distribution of this code
 * or any portion thereof, via any medium, is strictly prohibited.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db';
import { router } from './routes';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middlewares
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Accept large payloads for image base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api', router);

// Start server
async function startServer() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting ClearBG Backend Server...');
  console.log('----------------------------------------------------');

  await initDatabase();

  app.listen(PORT, () => {
    console.log(`📡 Backend Server listening on http://localhost:${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
    console.log('----------------------------------------------------');
  });
}

startServer();
