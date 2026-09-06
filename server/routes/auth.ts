/**
 * ClearBG AI Studio - Auth Routes (MongoDB Atlas)
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db';
import { User } from '../models/User';
import { History } from '../models/History';
import { generateOtpCode, sendOtpEmail, verifyOtpFromDatabase } from '../services/email';
import { hashPassword, comparePassword, generateToken, requireAuthMiddleware, AuthenticatedRequest } from '../services/auth';

export const authRouter = Router();

/**
 * 1. SEND OTP CODE (For Signup, OTP Login, or Forgot Password)
 */
authRouter.post('/send-otp', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { email, name, type } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpType = type || 'signup';

    // If signup, check if email already exists
    if (otpType === 'signup') {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists. Please log in.' });
      }
    }

    // If reset_password, check if email exists
    if (otpType === 'reset_password') {
      const existing = await User.findOne({ email: normalizedEmail });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'No account found with this email address.' });
      }
    }

    const otpCode = generateOtpCode();
    const result = await sendOtpEmail(normalizedEmail, otpCode, otpType, name);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    console.error('Send OTP Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. VERIFY OTP CODE
 */
authRouter.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { email, otpCode, type } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required' });
    }

    const isValid = await verifyOtpFromDatabase(email, otpCode, type || 'signup');
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
    }

    res.json({ success: true, message: 'Code verified successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. SIGN UP / REGISTER
 */
authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { email, name, password, otpCode } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP if provided
    if (otpCode) {
      const isValid = await verifyOtpFromDatabase(normalizedEmail, otpCode, 'signup');
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP code.' });
      }
    }

    // Check existing
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Account already exists with this email.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    const newUser = await User.create({
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      lastLoginAt: new Date(),
    });

    const userPayload = { id: newUser.id, email: newUser.email, name: newUser.name };
    const token = generateToken(userPayload);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userPayload,
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. LOGIN (Password or OTP)
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { email, password, otpCode } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    // Case A: Login with OTP
    if (otpCode) {
      const isValid = await verifyOtpFromDatabase(normalizedEmail, otpCode, 'login');
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP code.' });
      }
    }
    // Case B: Login with Password
    else if (password) {
      const isMatch = await comparePassword(password, user.passwordHash || '');
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Incorrect password.' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Password or OTP code is required' });
    }

    // Update last_login_at
    user.lastLoginAt = new Date();
    await user.save();

    const userPayload = { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
    const token = generateToken(userPayload);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: userPayload,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. FORGOT PASSWORD (Send Reset OTP)
 */
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    const otpCode = generateOtpCode();
    const result = await sendOtpEmail(normalizedEmail, otpCode, 'reset_password', existing.name);

    res.json({
      success: true,
      message: `Password reset code sent to ${normalizedEmail}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. RESET PASSWORD (Set new password with verified OTP)
 */
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { email, otpCode, newPassword } = req.body;
    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP code, and new password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isValid = await verifyOtpFromDatabase(normalizedEmail, otpCode, 'reset_password');
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code.' });
    }

    const passwordHash = await hashPassword(newPassword);
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      { passwordHash, updatedAt: new Date() }
    );

    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. UPDATE PROFILE
 */
authRouter.put('/profile', requireAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await connectToDatabase();
    const userId = req.user!.id;
    const { name, avatarUrl } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const updateFields: any = { name: name.trim(), updatedAt: new Date() };
    if (avatarUrl !== undefined) {
      updateFields.avatarUrl = avatarUrl;
    }

    await User.findOneAndUpdate({ id: userId }, updateFields);

    res.json({ success: true, message: 'Profile updated successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. GET CURRENT USER PROFILE & STATS
 */
authRouter.get('/me', requireAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await connectToDatabase();
    const userId = req.user!.id;
    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Compute user image statistics from History collection
    const historyCount = await History.countDocuments({ userId });
    const historyAgg = await History.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalBytes: { $sum: '$resultSize' } } },
    ]);

    const totalBytes = historyAgg.length > 0 ? historyAgg[0].totalBytes : 0;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        stats: {
          totalImages: historyCount,
          totalBytes,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
