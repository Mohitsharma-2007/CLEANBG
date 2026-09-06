/**
 * ClearBG AI Studio - OTP Code Model (MongoDB Atlas)
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpCode extends Document {
  email: string;
  otpCode: string;
  type: 'signup' | 'login' | 'reset_password';
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const OtpCodeSchema = new Schema<IOtpCode>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpCode: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['signup', 'login', 'reset_password'] },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL auto-cleanup!
    isUsed: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const OtpCode = mongoose.models.OtpCode || mongoose.model<IOtpCode>('OtpCode', OtpCodeSchema);
