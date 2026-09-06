# ClearBG AI Studio

> **State-of-the-Art AI Background Removal, Layer Studio & Super-Resolution Suite**  
> **Author & Sole Creator:** [Mohit Sharma](mailto:grnoida.mohitsharma2007@gmail.com)  
> **Copyright & Licensing:** Copyright &copy; 2026 Mohit Sharma. All Rights Reserved. **Proprietary and Confidential.**

---

## 🔒 Proprietary License Notice

**IMPORTANT:** This repository and all of its contents (source code, assets, styles, backend architecture, and models) are the exclusive intellectual property of **Mohit Sharma**.

- **No Unauthorized Use**: Strictly prohibited from copying, distributing, downloading to re-upload, forking, or utilizing in any personal or commercial product without express written consent from Mohit Sharma.
- **Mandatory Attribution**: If this codebase or any portion thereof is inspected or displayed in any system, full attribution to **Mohit Sharma** must remain intact under all circumstances.

---

## 🌟 Overview & Key Features

ClearBG AI Studio is an all-in-one image manipulation platform combining local-first browser AI inference, professional non-destructive layer editing, and high-performance serverless cloud storage.

1. **Precision AI Background Remover**:
   - Client-side deep learning powered by `@huggingface/transformers` (`briaai/RMBG-1.4` ONNX model).
   - High-fidelity edge alpha matting with zero bokeh artifacts.
   - Ultra-fast browser-side WASM execution with full user privacy.

2. **Photoshop-Grade Layer & Adjustment Suite**:
   - Non-destructive image editing pipeline.
   - Real-time adjustment controls: Brightness, Contrast, Saturation, Warmth, Blur, Sharpness.
   - Curated photographic presets (Studio Clean, Warm Vintage, Cinematic Punch, Noir Fade, Vibrant Pop, Cyberpunk Glow, etc.).
   - Layer styles: Outline / Sticker stroke, Drop Shadow with angle controls, Bokeh Blur.
   - Full integrated canvas editing modal with crop, annotations, filters, and fine-tuning.

3. **AI Super-Resolution & Upscaler**:
   - 2x, 4x, and 8x super-resolution engine with bilateral denoising and Retinex contrast enhancement.
   - Interactive before/after split comparison slider.

4. **Multi-Tool Utility Engine**:
   - Precision Resizer (Aspect ratio locking, pixel & percentage modes).
   - Smart Compressor (Dynamic target file size, live preview, quality calibration).
   - Format Converter (PNG, JPEG, WebP, AVIF).

5. **Cloud History & User Profile**:
   - Secure authentication with Gmail SMTP OTP verification.
   - PostgreSQL persistence for user cutouts, thumbnails, and edit histories.
   - Dual-tier storage: IndexedDB for instant offline performance + Cloud database sync.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: TypeScript, Vite, Vanilla CSS Design System, Web Workers, WASM.
- **AI Engine**: HuggingFace Transformers.js, ONNX Runtime Web.
- **Backend**: Express.js, TypeScript, PostgreSQL (`pg`), Nodemailer (Gmail SMTP).
- **Deployment Targets**: Vercel (Edge / Serverless) & GitHub.

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- Node.js 18+
- PostgreSQL (Local or hosted, e.g. Neon / Supabase)

### 2. Installation
```bash
git clone <your-private-repo-url>
cd "Background Remover"
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

> **Security Note**: Never commit `.env` to version control. The `.gitignore` is pre-configured to strictly ignore all `.env` files.

### 4. Run Development Server
```bash
# Starts both frontend (port 3000) and backend (port 5000) concurrently
npm start
```

---

## 🛡️ Vercel Deployment Guide

1. Deploy the project to Vercel via Git Integration or Vercel CLI.
2. In your Vercel Project Dashboard (**Settings > Environment Variables**), securely add the required variables:
   - `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` (or `DATABASE_URL`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `JWT_SECRET`
3. All sensitive variables are encrypted at rest by Vercel and remain exclusively on the serverless side. They are never bundled into the public client JavaScript.

---

## 👤 Author & Intellectual Property

**Mohit Sharma**  
- Email: [grnoida.mohitsharma2007@gmail.com](mailto:grnoida.mohitsharma2007@gmail.com)  
- Copyright &copy; 2026 Mohit Sharma. All Rights Reserved.
