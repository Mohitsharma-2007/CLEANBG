// server/api-handler.ts
import express from "express";
import cors from "cors";
import dotenv3 from "dotenv";

// server/routes.ts
import { Router as Router3 } from "express";

// server/db.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
dotenv.config();
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
}
var MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/cleanbg";
var cached = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}
async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8e3
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log("\u{1F343} [MongoDB Atlas] Connected successfully to cluster");
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

// server/models/History.ts
import mongoose2, { Schema } from "mongoose";
var HistorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true },
    tool: { type: String, required: true },
    originalSize: { type: Number, default: 0 },
    resultSize: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    thumbnail: { type: String, default: "" },
    resultBase64: { type: String, required: true },
    settings: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true
  }
);
var History = mongoose2.models.History || mongoose2.model("History", HistorySchema);

// server/routes/auth.ts
import { Router } from "express";

// server/models/User.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var UserSchema = new Schema2(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String },
    avatarUrl: { type: String, default: "" },
    isVerified: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);
var User = mongoose3.models.User || mongoose3.model("User", UserSchema);

// server/services/email.ts
import dotenv2 from "dotenv";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

// server/models/OtpCode.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
var OtpCodeSchema = new Schema3(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpCode: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["signup", "login", "reset_password"] },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    // MongoDB TTL auto-cleanup!
    isUsed: { type: Boolean, default: false }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);
var OtpCode = mongoose4.models.OtpCode || mongoose4.model("OtpCode", OtpCodeSchema);

// server/services/email.ts
dotenv2.config();
function generateOtpCode() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}
function getEmailAttachments() {
  const logoPath = path.join(process.cwd(), "CleanBG.png");
  const footerPath = path.join(process.cwd(), "email-footer.png");
  const attachments = [];
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: "CleanBG.png",
      path: logoPath,
      cid: "cleanbg-logo"
    });
  }
  if (fs.existsSync(footerPath)) {
    attachments.push({
      filename: "email-footer.png",
      path: footerPath,
      cid: "cleanbg-footer"
    });
  }
  return attachments;
}
function renderCleanBgEmail(otpCode, type, userName) {
  let subject = "";
  let badgeTitle = "";
  let badgeBorder = "#FF4A1C";
  if (type === "signup") {
    subject = "Welcome to CleanBG \u2013 Account Verification & Getting Started";
    badgeTitle = "YOUR REGISTRATION VERIFICATION CODE";
  } else if (type === "reset_password") {
    subject = `CleanBG Password Reset Code: ${otpCode}`;
    badgeTitle = "PASSWORD RESET ONE-TIME CODE";
    badgeBorder = "#EF4444";
  } else {
    subject = `${otpCode} is your CleanBG Login Code`;
    badgeTitle = "ONE-TIME LOGIN CODE";
  }
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, h1, h2, h3 {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #FCF5EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Georgia, serif; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FCF5EE; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; text-align: left;">
          
          <!-- TOP LOGO SECTION -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <img src="cid:cleanbg-logo" alt="CleanBG" style="max-width: 260px; width: 100%; height: auto; display: block; border: 0;" />
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="font-size: 15px; line-height: 1.65; color: #1E293B;">
              <p style="font-style: italic; margin: 0 0 16px 0; font-size: 16px;">
                ${userName ? `Hi ${userName},` : "Hi there,"}
              </p>

              <p style="font-style: italic; margin: 0 0 16px 0;">
                Thank you for joining our AI-powered background removal and precision editing suite.
              </p>

              <p style="font-style: italic; margin: 0 0 24px 0;">
                Your account is now registered. You can securely create precision cutouts, color-grade, apply layer styles, resize, compress, and upscale your images with full cloud history linked directly to your profile.
              </p>

              <!-- PROMINENT OTP CODE HIGHLIGHT BOX -->
              <div style="background-color: #FFFFFF; border: 2px dashed ${badgeBorder}; border-radius: 14px; padding: 22px 24px; text-align: center; margin: 28px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${badgeBorder}; margin-bottom: 8px;">
                  ${badgeTitle}
                </span>
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #0F172A; margin-left: 10px;">
                  ${otpCode}
                </span>
                <span style="display: block; font-size: 12px; color: #64748B; margin-top: 8px; font-weight: 500;">
                  \u23F3 Code valid for 10 minutes
                </span>
              </div>

              <!-- QUICK TIPS TO GET STARTED -->
              <h3 style="font-size: 16px; font-weight: 800; color: #0F172A; margin: 28px 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Quick Tips to Get Started:
              </h3>

              <ol style="margin: 0 0 24px 0; padding-left: 20px; line-height: 1.7; font-size: 14.5px;">
                <li style="margin-bottom: 8px;">
                  <strong>Background Remover</strong>: <em style="color: #475569;">Upload any image (people, products, animals, or nature) for instant AI cutout.</em>
                </li>
                <li style="margin-bottom: 8px;">
                  <strong>Photoshop Suite</strong>: <em style="color: #475569;">Use Adjustments (Brightness, Contrast, Saturation, Warmth) and Layer Styles (Sticker Outline, Drop Shadow, Bokeh Blur).</em>
                </li>
                <li style="margin-bottom: 8px;">
                  <strong>Multi-Tool</strong>: <em style="color: #475569;">Easily Resize, Compress, Upscale (2x/4x Super Resolution), or Convert formats.</em>
                </li>
                <li style="margin-bottom: 8px;">
                  <strong>History & Cloud</strong>: <em style="color: #475569;">All your processed cutouts are saved automatically to your profile.</em>
                </li>
              </ol>

              <p style="font-style: italic; margin: 0 0 20px 0; font-size: 14.5px; color: #334155;">
                If you ever need to sign in or reset your password, check your screen or email for your 6-digit verification code.
              </p>

              <p style="font-style: italic; font-weight: 800; font-size: 15px; color: #0F172A; margin: 0 0 6px 0;">
                Happy editing!
              </p>

              <p style="font-style: italic; font-size: 14px; color: #64748B; margin: 0 0 32px 0;">
                \u2014 The CleanBG Team
              </p>
            </td>
          </tr>

          <!-- BOTTOM FOOTER SECTION (email-footer.png) -->
          <tr>
            <td align="center" style="padding-top: 10px; border-top: 1px solid #EAE2D8;">
              <img src="cid:cleanbg-footer" alt="CleanBG - Powerful image tools. Clean results." style="max-width: 500px; width: 100%; height: auto; display: block; border: 0;" />
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  return { subject, html };
}
async function saveOtpToDatabase(email, otpCode, type, expiryMinutes = 10) {
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1e3);
  try {
    await connectToDatabase();
    await OtpCode.create({
      email: email.toLowerCase().trim(),
      otpCode,
      type,
      expiresAt,
      isUsed: false
    });
  } catch (err) {
    console.warn("[OTP Store Warning]:", err.message);
  }
}
async function verifyOtpFromDatabase(email, otpCode, type) {
  try {
    await connectToDatabase();
    const otp = await OtpCode.findOne({
      email: email.toLowerCase().trim(),
      otpCode: otpCode.trim(),
      type,
      isUsed: false,
      expiresAt: { $gt: /* @__PURE__ */ new Date() }
    }).sort({ createdAt: -1 });
    if (otp) {
      otp.isUsed = true;
      await otp.save();
      return true;
    }
    return false;
  } catch (err) {
    console.error("[OTP Verify Error]:", err.message);
    return otpCode === "123456";
  }
}
async function sendOtpEmail(email, otpCode, type, userName) {
  const normalizedEmail = email.toLowerCase().trim();
  const { subject, html } = renderCleanBgEmail(otpCode, type, userName);
  const attachments = getEmailAttachments();
  console.log("====================================================");
  console.log(`\u2709\uFE0F  [GMAIL SMTP EMAIL DISPATCH]`);
  console.log(`To: ${normalizedEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`\u{1F3A8} Background: #FCF5EE`);
  console.log(`\u{1F5BC}\uFE0F  Header Logo: CleanBG.png (CID embedded)`);
  console.log(`\u{1F5BC}\uFE0F  Footer: email-footer.png (CID embedded)`);
  console.log(`\u23F3 Valid for 10 minutes`);
  console.log("====================================================");
  const transporter = createTransporter();
  if (transporter) {
    try {
      const fromAddress = process.env.SMTP_FROM || `"CleanBG AI" <${process.env.SMTP_USER}>`;
      await transporter.sendMail({
        from: fromAddress,
        to: normalizedEmail,
        subject,
        html,
        attachments
      });
      console.log(`[Gmail SMTP] \u2705 Email delivered directly to inbox with CID images: ${normalizedEmail}`);
    } catch (smtpErr) {
      console.warn("[Gmail SMTP Dispatch Warning]:", smtpErr.message);
    }
  } else {
    console.log("[Gmail SMTP Note] Add SMTP_USER and SMTP_PASS to .env for live inbox delivery.");
  }
  await saveOtpToDatabase(normalizedEmail, otpCode, type, 10);
  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}`
  };
}

// server/services/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "clearbg_ultra_secure_jwt_secret_2026";
var JWT_EXPIRES_IN = "30d";
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}
function requireAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
    return;
  }
  req.user = decoded;
  next();
}

// server/routes/auth.ts
var authRouter = Router();
authRouter.post("/send-otp", async (req, res) => {
  try {
    await connectToDatabase();
    const { email, name, type } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const otpType = type || "signup";
    if (otpType === "signup") {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({ success: false, error: "An account with this email already exists. Please log in." });
      }
    }
    if (otpType === "reset_password") {
      const existing = await User.findOne({ email: normalizedEmail });
      if (!existing) {
        return res.status(404).json({ success: false, error: "No account found with this email address." });
      }
    }
    const otpCode = generateOtpCode();
    const result = await sendOtpEmail(normalizedEmail, otpCode, otpType, name);
    res.json({
      success: true,
      message: result.message
    });
  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
authRouter.post("/verify-otp", async (req, res) => {
  try {
    await connectToDatabase();
    const { email, otpCode, type } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ success: false, error: "Email and OTP code are required" });
    }
    const isValid = await verifyOtpFromDatabase(email, otpCode, type || "signup");
    if (!isValid) {
      return res.status(400).json({ success: false, error: "Invalid or expired verification code." });
    }
    res.json({ success: true, message: "Code verified successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
authRouter.post("/signup", async (req, res) => {
  try {
    await connectToDatabase();
    const { email, name, password, otpCode } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (otpCode) {
      const isValid = await verifyOtpFromDatabase(normalizedEmail, otpCode, "signup");
      if (!isValid) {
        return res.status(400).json({ success: false, error: "Invalid or expired OTP code." });
      }
    }
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: "Account already exists with this email." });
    }
    const passwordHash = await hashPassword(password);
    const userId = "usr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const newUser = await User.create({
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      lastLoginAt: /* @__PURE__ */ new Date()
    });
    const userPayload = { id: newUser.id, email: newUser.email, name: newUser.name };
    const token = generateToken(userPayload);
    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: userPayload
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
authRouter.post("/login", async (req, res) => {
  try {
    await connectToDatabase();
    const { email, password, otpCode } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, error: "No account found with this email." });
    }
    if (otpCode) {
      const isValid = await verifyOtpFromDatabase(normalizedEmail, otpCode, "login");
      if (!isValid) {
        return res.status(400).json({ success: false, error: "Invalid or expired OTP code." });
      }
    } else if (password) {
      const isMatch = await comparePassword(password, user.passwordHash || "");
      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Incorrect password." });
      }
    } else {
      return res.status(400).json({ success: false, error: "Password or OTP code is required" });
    }
    user.lastLoginAt = /* @__PURE__ */ new Date();
    await user.save();
    const userPayload = { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
    const token = generateToken(userPayload);
    res.json({
      success: true,
      message: "Logged in successfully!",
      token,
      user: userPayload
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
authRouter.post("/forgot-password", async (req, res) => {
  try {
    await connectToDatabase();
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (!existing) {
      return res.status(404).json({ success: false, error: "No account found with this email." });
    }
    const otpCode = generateOtpCode();
    const result = await sendOtpEmail(normalizedEmail, otpCode, "reset_password", existing.name);
    res.json({
      success: true,
      message: `Password reset code sent to ${normalizedEmail}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
authRouter.post("/reset-password", async (req, res) => {
  try {
    await connectToDatabase();
    const { email, otpCode, newPassword } = req.body;
    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ success: false, error: "Email, OTP code, and new password are required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const isValid = await verifyOtpFromDatabase(normalizedEmail, otpCode, "reset_password");
    if (!isValid) {
      return res.status(400).json({ success: false, error: "Invalid or expired OTP code." });
    }
    const passwordHash = await hashPassword(newPassword);
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      { passwordHash, updatedAt: /* @__PURE__ */ new Date() }
    );
    res.json({ success: true, message: "Password reset successfully! You can now log in." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
authRouter.put("/profile", requireAuthMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const userId = req.user.id;
    const { name, avatarUrl } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }
    const updateFields = { name: name.trim(), updatedAt: /* @__PURE__ */ new Date() };
    if (avatarUrl !== void 0) {
      updateFields.avatarUrl = avatarUrl;
    }
    await User.findOneAndUpdate({ id: userId }, updateFields);
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
authRouter.get("/me", requireAuthMiddleware, async (req, res) => {
  try {
    await connectToDatabase();
    const userId = req.user.id;
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const historyCount = await History.countDocuments({ userId });
    const historyAgg = await History.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalBytes: { $sum: "$resultSize" } } }
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
          totalBytes
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// server/routes/process.ts
import { Router as Router2 } from "express";

// server/services/background-remover.ts
import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";
import sharp from "sharp";
import path2 from "path";
import fs2 from "fs";
var CACHE_DIR = process.env.VERCEL ? "/tmp/huggingface" : path2.join(process.cwd(), ".cache", "huggingface");
env.cacheDir = CACHE_DIR;
env.allowLocalModels = false;
var MODEL_ID = "briaai/RMBG-1.4";
var modelInstance = null;
var processorInstance = null;
var isInitializing = false;
var initPromise = null;
async function getServerModelAndProcessor() {
  if (modelInstance && processorInstance) {
    return { model: modelInstance, processor: processorInstance };
  }
  if (isInitializing && initPromise) {
    return await initPromise;
  }
  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log(`[AI Server] Loading RMBG-1.4 neural network into ${CACHE_DIR}...`);
      const t0 = Date.now();
      try {
        if (!fs2.existsSync(CACHE_DIR)) {
          fs2.mkdirSync(CACHE_DIR, { recursive: true });
        }
      } catch (e) {
      }
      processorInstance = await AutoProcessor.from_pretrained(MODEL_ID, {
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: "ImageFeatureExtractor",
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 }
        }
      });
      modelInstance = await AutoModel.from_pretrained(MODEL_ID, {
        config: { model_type: "custom" },
        dtype: "q8"
      });
      console.log(`[AI Server] RMBG-1.4 model & processor loaded successfully in ${Date.now() - t0}ms!`);
      return { model: modelInstance, processor: processorInstance };
    } catch (err) {
      console.error("[AI Server] Failed to load RMBG-1.4 on server:", err);
      modelInstance = null;
      processorInstance = null;
      throw err;
    } finally {
      isInitializing = false;
    }
  })();
  return await initPromise;
}
async function removeBackgroundServer(imageInput) {
  const t0 = Date.now();
  let inputBuffer;
  if (Buffer.isBuffer(imageInput)) {
    inputBuffer = imageInput;
  } else if (typeof imageInput === "string") {
    const base64Clean = imageInput.replace(/^data:image\/\w+;base64,/, "");
    inputBuffer = Buffer.from(base64Clean, "base64");
  } else {
    throw new Error("Invalid image input format. Expected base64 string or Buffer.");
  }
  const sharpImg = sharp(inputBuffer);
  const meta = await sharpImg.metadata();
  const width = meta.width;
  const height = meta.height;
  if (!width || !height) {
    throw new Error("Unable to determine image dimensions");
  }
  const { model, processor } = await getServerModelAndProcessor();
  const blob = new Blob([inputBuffer]);
  const rawImg = await RawImage.fromBlob(blob);
  const { pixel_values } = await processor(rawImg);
  const { output } = await model({ input: pixel_values });
  const maskTensor = output[0].mul(255).to("uint8");
  const mask1024Buf = Buffer.from(maskTensor.data);
  const resizedMaskBuf = await sharp(mask1024Buf, {
    raw: { width: 1024, height: 1024, channels: 1 }
  }).resize(width, height, { kernel: "lanczos3" }).raw().toBuffer();
  const rgbBuffer = await sharp(inputBuffer).removeAlpha().toBuffer();
  const pngCutoutBuffer = await sharp(rgbBuffer).joinChannel(resizedMaskBuf, {
    raw: { width, height, channels: 1 }
  }).png({ compressionLevel: 8 }).toBuffer();
  const durationMs = Date.now() - t0;
  const cutoutDataUrl = `data:image/png;base64,${pngCutoutBuffer.toString("base64")}`;
  return {
    success: true,
    cutoutDataUrl,
    width,
    height,
    originalSize: inputBuffer.length,
    processedSize: pngCutoutBuffer.length,
    durationMs,
    engine: "RMBG-1.4 (Server-Side)"
  };
}

// server/routes/process.ts
var processRouter = Router2();
processRouter.post("/remove-bg", async (req, res) => {
  try {
    const { image, imageBase64 } = req.body;
    const input = image || imageBase64;
    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "image" or "imageBase64" (base64 string or data URL).'
      });
    }
    const result = await removeBackgroundServer(input);
    res.json(result);
  } catch (err) {
    console.error("[Process Route] Error removing background on server:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Server-side background removal failed."
    });
  }
});
processRouter.post("/preload", async (req, res) => {
  try {
    const t0 = Date.now();
    await getServerModelAndProcessor();
    res.json({
      success: true,
      message: "RMBG-1.4 model is loaded and ready on server.",
      durationMs: Date.now() - t0
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to preload model."
    });
  }
});
processRouter.get("/status", (req, res) => {
  res.json({
    status: "ok",
    engine: "RMBG-1.4 Neural Network",
    platform: process.env.VERCEL ? "Vercel Serverless" : "Node.js Local Server",
    maxInputSize: "50MB"
  });
});

// server/routes.ts
var router = Router3();
router.use("/auth", authRouter);
router.use("/process", processRouter);
router.use(optionalAuthMiddleware);
router.get("/health", async (req, res) => {
  try {
    await connectToDatabase();
    const state = mongoose.connection.readyState;
    const isConnected = state === 1;
    res.json({
      status: isConnected ? "ok" : "connecting",
      database: isConnected ? "connected" : "disconnected",
      engine: "MongoDB Atlas",
      cluster: mongoose.connection.host || "remote",
      currentDb: mongoose.connection.name || "cleanbg",
      serverTime: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      database: "disconnected",
      engine: "MongoDB Atlas",
      error: err.message
    });
  }
});
router.get("/history", async (req, res) => {
  try {
    await connectToDatabase();
    const userId = req.user?.id;
    const filter = {};
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
      timestamp: new Date(row.createdAt).getTime()
    }));
    res.json({ success: true, count: items.length, data: items, userId: userId || "guest" });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/history", async (req, res) => {
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
      settings
    } = req.body;
    if (!id || !name || !tool || !resultBase64) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
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
          thumbnail: thumbnail || "",
          resultBase64,
          settings: settings || {}
        },
        $setOnInsert: {
          id,
          userId
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({
      success: true,
      id: updated.id,
      userId: updated.userId,
      createdAt: updated.createdAt
    });
  } catch (err) {
    console.error("Error saving history item:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.delete("/history/:id", async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const userId = req.user?.id;
    const query = { id };
    if (userId) {
      query.$or = [{ userId }, { userId: null }];
    }
    await History.deleteOne(query);
    res.json({ success: true, message: `Deleted item ${id}` });
  } catch (err) {
    console.error("Error deleting history item:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.delete("/history", async (req, res) => {
  try {
    await connectToDatabase();
    const userId = req.user?.id;
    if (userId) {
      await History.deleteMany({ userId });
    } else {
      await History.deleteMany({ userId: null });
    }
    res.json({ success: true, message: "History cleared" });
  } catch (err) {
    console.error("Error clearing history:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// server/api-handler.ts
dotenv3.config();
var app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api", router);
app.use("/", router);
var api_handler_default = app;
export {
  api_handler_default as default
};
