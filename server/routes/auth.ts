import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { generateOtpCode, sendOtpEmail, verifyOtpFromDatabase } from '../services/email';
import { hashPassword, comparePassword, generateToken, requireAuthMiddleware, AuthenticatedRequest } from '../services/auth';

export const authRouter = Router();

/**
 * 1. SEND OTP CODE (For Signup, OTP Login, or Forgot Password)
 */
authRouter.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, name, type } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpType = type || 'signup';

    // If signup, check if email already exists
    if (otpType === 'signup') {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
      if (existing.rowCount && existing.rowCount > 0) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists. Please log in.' });
      }
    }

    // If reset_password, check if email exists
    if (otpType === 'reset_password') {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
      if (!existing.rowCount || existing.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'No account found with this email address.' });
      }
    }

    const otpCode = generateOtpCode();
    const result = await sendOtpEmail(normalizedEmail, otpCode, otpType, name);

    res.json({
      success: true,
      message: result.message,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: result.devOtp } : {}),
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
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(400).json({ success: false, error: 'Account already exists with this email.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    await pool.query(
      `INSERT INTO users (id, email, name, password_hash, last_login_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, normalizedEmail, name.trim(), passwordHash]
    );

    const userPayload = { id: userId, email: normalizedEmail, name: name.trim() };
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
    const { email, password, otpCode } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const result = await pool.query(
      'SELECT id, email, name, password_hash, avatar_url FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    const user = result.rows[0];

    // Case A: Login with OTP
    if (otpCode) {
      const isValid = await verifyOtpFromDatabase(normalizedEmail, otpCode, 'login');
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP code.' });
      }
    }
    // Case B: Login with Password
    else if (password) {
      const isMatch = await comparePassword(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Incorrect password.' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Password or OTP code is required' });
    }

    // Update last_login_at
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const userPayload = { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url };
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
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await pool.query('SELECT id, name FROM users WHERE email = $1', [normalizedEmail]);
    if (!existing.rowCount || existing.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    const otpCode = generateOtpCode();
    const result = await sendOtpEmail(normalizedEmail, otpCode, 'reset_password', existing.rows[0].name);

    res.json({
      success: true,
      message: `Password reset code sent to ${normalizedEmail}`,
      devOtp: result.devOtp,
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
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [passwordHash, normalizedEmail]
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
    const userId = req.user!.id;
    const { name, avatarUrl } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    await pool.query(
      'UPDATE users SET name = $1, avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3',
      [name.trim(), avatarUrl || null, userId]
    );

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
    const userId = req.user!.id;
    const userResult = await pool.query(
      'SELECT id, email, name, avatar_url, last_login_at, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rowCount || userResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Compute user image statistics
    const statsResult = await pool.query(
      `SELECT COUNT(*) as total_images, COALESCE(SUM(result_size), 0) as total_bytes 
       FROM history WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        stats: {
          totalImages: parseInt(statsResult.rows[0].total_images || '0'),
          totalBytes: parseInt(statsResult.rows[0].total_bytes || '0'),
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
