/**
 * ClearBG AI Studio - History Model (MongoDB Atlas)
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IHistory extends Document {
  id: string;
  userId?: string | null;
  name: string;
  tool: string;
  originalSize: number;
  resultSize: number;
  width: number;
  height: number;
  thumbnail: string;
  resultBase64: string;
  originalBase64?: string | null;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const HistorySchema = new Schema<IHistory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true },
    tool: { type: String, required: true },
    originalSize: { type: Number, default: 0 },
    resultSize: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    thumbnail: { type: String, default: '' },
    resultBase64: { type: String, required: true },
    originalBase64: { type: String, default: null },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export const History = mongoose.models.History || mongoose.model<IHistory>('History', HistorySchema);
