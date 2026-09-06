/**
 * ClearBG AI Studio - MongoDB Atlas Connection Manager
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Ensure reliable SRV DNS resolution for MongoDB Atlas across local & cloud environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignored if custom servers unavailable
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/cleanbg';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = (global as any).mongooseCache || { conn: null, promise: null };
if (!(global as any).mongooseCache) {
  (global as any).mongooseCache = cached;
}

/**
 * Connect to MongoDB Atlas with Vercel Serverless Connection Caching
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log('🍃 [MongoDB Atlas] Connected successfully to cluster');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Initialize Database Connection
 */
export async function initDatabase(): Promise<boolean> {
  try {
    await connectToDatabase();
    return true;
  } catch (err: any) {
    console.warn('⚠️ [MongoDB Atlas Notice]:', err.message);
    return false;
  }
}

export { mongoose };
