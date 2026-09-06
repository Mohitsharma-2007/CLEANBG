/**
 * ClearBG AI Studio - Vercel Serverless Function Entrypoint
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, or distribution of this code
 * or any portion thereof, via any medium, is strictly prohibited.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from '../server/routes';

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Vercel rewrites /api/* to this handler. Support both /api prefixed and direct routes.
app.use('/api', router);
app.use('/', router);

export default app;
