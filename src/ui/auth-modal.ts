import { ICONS } from './icons';
import { getLogoSvg } from './logo';
import { authState } from '../core/auth-state';
import { events } from '../core/event-bus';

type AuthView = 'login' | 'signup' | 'otp' | 'forgot' | 'reset' | 'profile';

let currentView: AuthView = 'login';
let pendingEmail = '';
let pendingName = '';
let pendingPassword = '';
let pendingOtpType: 'signup' | 'login' | 'reset_password' = 'signup';
let resendTimer: number | null = null;
let resendSeconds = 60;

export function createAuthModal(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'auth-modal-overlay';
  overlay.style.display = 'none';

  overlay.innerHTML = `
    <div class="modal" id="auth-modal-card" style="max-width:440px; width:90%; position:relative; overflow:hidden;">
      <button class="modal-close" id="auth-modal-close" style="position:absolute; top:16px; right:16px; background:none; border:none; color:var(--color-text-muted); cursor:pointer; font-size:18px; z-index:10;">
        ${ICONS.close}
      </button>

      <div id="auth-modal-content" style="padding: 32px 24px 24px 24px; display: flex; flex-direction: column; width: 100%; box-sizing: border-box;"></div>
    </div>
  `;

  // Wait until it's inserted to mount icons


  // Close handlers
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal();
  });
  overlay.querySelector('#auth-modal-close')?.addEventListener('click', () => closeAuthModal());

  events.on('auth:open', (view?: AuthView) => {
    openAuthModal(view || (authState.isAuthenticated() ? 'profile' : 'login'));
  });

  return overlay;
}

export function openAuthModal(view: AuthView = 'login'): void {
  const overlay = document.getElementById('auth-modal-overlay');
  if (!overlay) return;

  currentView = view;
  renderAuthView();
  overlay.style.display = 'flex';
}

export function closeAuthModal(): void {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  if (resendTimer) clearInterval(resendTimer);
}

function renderAuthView(): void {
  const container = document.getElementById('auth-modal-content');
  if (!container) return;

  switch (currentView) {
    case 'login':
      renderLoginView(container);
      break;
    case 'signup':
      renderSignupView(container);
      break;
    case 'otp':
      renderOtpView(container);
      break;
    case 'forgot':
      renderForgotView(container);
      break;
    case 'reset':
      renderResetView(container);
      break;
    case 'profile':
      renderProfileView(container);
      break;
  }
  

}

/**
 * 1. LOGIN VIEW
 */
function renderLoginView(container: HTMLElement): void {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:20px; padding-top:12px;">
      <div style="margin:0 auto 12px; display:inline-block;">
        ${getLogoSvg(42, false)}
      </div>
      <h2 style="font-size:22px; font-weight:700; color:var(--color-text); margin:0;">Welcome to ClearBG</h2>
      <p style="font-size:13px; color:var(--color-text-secondary); margin-top:4px;">Sign in to save your history and cutouts on your ID</p>
    </div>

    <form id="form-login" style="display:flex; flex-direction:column; gap:14px;">
      <div>
        <label class="setting-label" style="margin-bottom:6px;"><span class="label">Email Address</span></label>
        <input type="email" class="input" id="login-email" placeholder="you@example.com" required style="width:100%" />
      </div>

      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label class="setting-label"><span class="label">Password</span></label>
          <a href="#" id="link-forgot-pass" style="font-size:12px; color:var(--color-primary); text-decoration:none; font-weight:500;">Forgot Password?</a>
        </div>
        <input type="password" class="input" id="login-password" placeholder="••••••••" required style="width:100%" />
      </div>

      <div id="login-error" style="color:var(--color-error); font-size:13px; display:none;"></div>

      <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-login" style="width:100%; margin-top:6px;">
        Sign In
      </button>

      <button type="button" class="btn btn-secondary" id="btn-login-with-otp" style="width:100%;">
         Sign In with Email OTP
      </button>
    </form>

    <div style="text-align:center; margin-top:20px; font-size:13px; color:var(--color-text-secondary);">
      Don't have an account? 
      <a href="#" id="link-goto-signup" style="color:var(--color-primary); font-weight:600; text-decoration:none;">Create Account</a>
    </div>
  `;

  // Submit Password Login
  const form = container.querySelector('#form-login') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (container.querySelector('#login-email') as HTMLInputElement).value;
    const password = (container.querySelector('#login-password') as HTMLInputElement).value;
    const btn = container.querySelector('#btn-submit-login') as HTMLButtonElement;
    const errEl = container.querySelector('#login-error') as HTMLElement;

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errEl.style.display = 'none';

    try {
      await authState.login(email, password);
      events.emit('notify', { type: 'success', title: 'Welcome Back', message: 'Signed in successfully!' });
      closeAuthModal();
    } catch (err: any) {
      errEl.textContent = err.message || 'Login failed';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Login with OTP
  container.querySelector('#btn-login-with-otp')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const email = (container.querySelector('#login-email') as HTMLInputElement).value;
    if (!email) {
      alert('Please enter your email address first.');
      return;
    }
    pendingEmail = email;
    pendingOtpType = 'login';

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.textContent = 'Sending...';

    try {
      const res = await authState.sendOtp(email, 'login');
      events.emit('notify', {
        type: 'info',
        title: 'OTP Dispatched',
        message: res.message + (res.devOtp ? ` (Code: ${res.devOtp})` : ''),
      });
      currentView = 'otp';
      renderAuthView();
    } catch (err: any) {
      alert(err.message);
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

  container.querySelector('#link-forgot-pass')?.addEventListener('click', (e) => {
    e.preventDefault();
    currentView = 'forgot';
    renderAuthView();
  });

  container.querySelector('#link-goto-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    currentView = 'signup';
    renderAuthView();
  });
}

/**
 * 2. SIGN UP VIEW
 */
function renderSignupView(container: HTMLElement): void {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:20px; padding-top:12px;">
      <div style="margin:0 auto 12px; display:inline-block;">
        ${getLogoSvg(42, false)}
      </div>
      <h2 style="font-size:22px; font-weight:700; color:var(--color-text); margin:0;">Create Account</h2>
      <p style="font-size:13px; color:var(--color-text-secondary); margin-top:4px;">Join ClearBG with instant email verification</p>
    </div>

    <form id="form-signup" style="display:flex; flex-direction:column; gap:14px;">
      <div>
        <label class="setting-label" style="margin-bottom:6px;"><span class="label">Full Name</span></label>
        <input type="text" class="input" id="signup-name" placeholder="John Doe" required style="width:100%" />
      </div>

      <div>
        <label class="setting-label" style="margin-bottom:6px;"><span class="label">Email Address</span></label>
        <input type="email" class="input" id="signup-email" placeholder="you@example.com" required style="width:100%" />
      </div>

      <div>
        <label class="setting-label" style="margin-bottom:6px;"><span class="label">Password</span></label>
        <input type="password" class="input" id="signup-password" placeholder="At least 6 characters" minlength="6" required style="width:100%" />
      </div>

      <div id="signup-error" style="color:var(--color-error); font-size:13px; display:none;"></div>

      <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-signup" style="width:100%; margin-top:6px;">
        Send Verification Code
      </button>
    </form>

    <div style="text-align:center; margin-top:20px; font-size:13px; color:var(--color-text-secondary);">
      Already have an account? 
      <a href="#" id="link-goto-login" style="color:var(--color-primary); font-weight:600; text-decoration:none;">Sign In</a>
    </div>
  `;

  const form = container.querySelector('#form-signup') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (container.querySelector('#signup-name') as HTMLInputElement).value;
    const email = (container.querySelector('#signup-email') as HTMLInputElement).value;
    const password = (container.querySelector('#signup-password') as HTMLInputElement).value;
    const btn = container.querySelector('#btn-submit-signup') as HTMLButtonElement;
    const errEl = container.querySelector('#signup-error') as HTMLElement;

    btn.disabled = true;
    btn.textContent = 'Sending OTP...';
    errEl.style.display = 'none';

    try {
      pendingName = name;
      pendingEmail = email;
      pendingPassword = password;
      pendingOtpType = 'signup';

      const res = await authState.sendOtp(email, 'signup');
      events.emit('notify', {
        type: 'info',
        title: 'OTP Sent',
        message: res.message + (res.devOtp ? ` (Code: ${res.devOtp})` : ''),
      });

      currentView = 'otp';
      renderAuthView();
    } catch (err: any) {
      errEl.textContent = err.message || 'Signup failed';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Verification Code';
    }
  });

  container.querySelector('#link-goto-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    currentView = 'login';
    renderAuthView();
  });
}

/**
 * 3. VERIFY OTP VIEW
 */
function renderOtpView(container: HTMLElement): void {
  startResendCountdown();

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:20px; padding-top:12px;">
      <div style="width:48px; height:48px; margin:0 auto 12px; background:rgba(16,185,129,0.15); color:#10b981; border-radius:12px; display:flex; align-items:center; justify-content:center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      </div>
      <h2 style="font-size:22px; font-weight:700; color:var(--color-text); margin:0;">Enter Verification Code</h2>
      <p style="font-size:13px; color:var(--color-text-secondary); margin-top:4px;">
        We sent a 6-digit code via Email to <strong>${pendingEmail}</strong>
      </p>
    </div>

    <form id="form-otp" style="display:flex; flex-direction:column; gap:16px;">
      <div>
        <input type="text" class="input" id="otp-input" placeholder="123456" maxlength="6" pattern="[0-9]{6}" required 
          style="width:100%; text-align:center; font-size:24px; letter-spacing:8px; font-weight:700; font-family:var(--font-mono);" autofocus />
      </div>

      <div id="otp-error" style="color:var(--color-error); font-size:13px; display:none; text-align:center;"></div>

      <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-otp" style="width:100%;">
        Verify & Continue
      </button>

      <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; color:var(--color-text-secondary);">
        <span id="countdown-text">Resend in 60s</span>
        <button type="button" id="btn-resend-otp" class="btn-ghost" style="font-size:13px; padding:0; display:none; color:var(--color-primary); font-weight:600;">Resend Code</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#form-otp') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otpCode = (container.querySelector('#otp-input') as HTMLInputElement).value.trim();
    const btn = container.querySelector('#btn-submit-otp') as HTMLButtonElement;
    const errEl = container.querySelector('#otp-error') as HTMLElement;

    btn.disabled = true;
    btn.textContent = 'Verifying...';
    errEl.style.display = 'none';

    try {
      if (pendingOtpType === 'signup') {
        await authState.signup(pendingEmail, pendingName, pendingPassword, otpCode);
        events.emit('notify', { type: 'success', title: 'Account Verified', message: 'Welcome to ClearBG!' });
        closeAuthModal();
      } else if (pendingOtpType === 'login') {
        await authState.login(pendingEmail, undefined, otpCode);
        events.emit('notify', { type: 'success', title: 'Logged In', message: 'Signed in successfully!' });
        closeAuthModal();
      } else if (pendingOtpType === 'reset_password') {
        currentView = 'reset';
        renderAuthView();
      }
    } catch (err: any) {
      errEl.textContent = err.message || 'Invalid code';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify & Continue';
    }
  });

  // Resend OTP
  container.querySelector('#btn-resend-otp')?.addEventListener('click', async () => {
    try {
      const res = await authState.sendOtp(pendingEmail, pendingOtpType);
      events.emit('notify', { type: 'info', title: 'Code Resent', message: res.message + (res.devOtp ? ` (${res.devOtp})` : '') });
      startResendCountdown();
    } catch (err: any) {
      alert(err.message);
    }
  });
}

function startResendCountdown(): void {
  resendSeconds = 60;
  if (resendTimer) clearInterval(resendTimer);

  resendTimer = window.setInterval(() => {
    resendSeconds--;
    const textEl = document.getElementById('countdown-text');
    const resendBtn = document.getElementById('btn-resend-otp');

    if (textEl && resendBtn) {
      if (resendSeconds > 0) {
        textEl.textContent = `Resend in ${resendSeconds}s`;
        textEl.style.display = 'inline';
        resendBtn.style.display = 'none';
      } else {
        textEl.style.display = 'none';
        resendBtn.style.display = 'inline';
        if (resendTimer) clearInterval(resendTimer);
      }
    }
  }, 1000);
}

/**
 * 4. FORGOT PASSWORD VIEW
 */
function renderForgotView(container: HTMLElement): void {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:20px; padding-top:12px;">
      <div style="margin:0 auto 12px; display:inline-block;">
        ${getLogoSvg(42, false)}
      </div>
      <h2 style="font-size:22px; font-weight:700; color:var(--color-text); margin:0;">Reset Password</h2>
      <p style="font-size:13px; color:var(--color-text-secondary); margin-top:4px;">Enter your email to receive an OTP verification code</p>
    </div>

    <form id="form-forgot" style="display:flex; flex-direction:column; gap:14px;">
      <div>
        <label class="setting-label" style="margin-bottom:6px;"><span class="label">Your Email</span></label>
        <input type="email" class="input" id="forgot-email" placeholder="you@example.com" required style="width:100%" />
      </div>

      <div id="forgot-error" style="color:var(--color-error); font-size:13px; display:none;"></div>

      <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-forgot" style="width:100%;">
        Send Reset OTP
      </button>

      <button type="button" class="btn btn-ghost" id="btn-back-login" style="width:100%;">
        ← Back to Login
      </button>
    </form>
  `;

  const form = container.querySelector('#form-forgot') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (container.querySelector('#forgot-email') as HTMLInputElement).value;
    const btn = container.querySelector('#btn-submit-forgot') as HTMLButtonElement;
    const errEl = container.querySelector('#forgot-error') as HTMLElement;

    btn.disabled = true;
    btn.textContent = 'Sending...';
    errEl.style.display = 'none';

    try {
      pendingEmail = email;
      pendingOtpType = 'reset_password';
      const res = await authState.forgotPassword(email);
      events.emit('notify', {
        type: 'info',
        title: 'Reset Code Sent',
        message: res.message + (res.devOtp ? ` (${res.devOtp})` : ''),
      });

      currentView = 'otp';
      renderAuthView();
    } catch (err: any) {
      errEl.textContent = err.message || 'Failed to send reset code';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Reset OTP';
    }
  });

  container.querySelector('#btn-back-login')?.addEventListener('click', () => {
    currentView = 'login';
    renderAuthView();
  });
}

/**
 * 5. RESET PASSWORD VIEW
 */
function renderResetView(container: HTMLElement): void {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:20px; padding-top:12px;">
      <div style="margin:0 auto 12px; display:inline-block;">
        ${getLogoSvg(42, false)}
      </div>
      <h2 style="font-size:22px; font-weight:700; color:var(--color-text); margin:0;">Set New Password</h2>
      <p style="font-size:13px; color:var(--color-text-secondary); margin-top:4px;">Enter your new account password</p>
    </div>

    <form id="form-reset" style="display:flex; flex-direction:column; gap:14px;">
      <div>
        <label class="setting-label" style="margin-bottom:6px;"><span class="label">New Password</span></label>
        <input type="password" class="input" id="new-password" placeholder="At least 6 characters" minlength="6" required style="width:100%" />
      </div>

      <div>
        <label class="setting-label" style="margin-bottom:6px;"><span class="label">Confirm Password</span></label>
        <input type="password" class="input" id="confirm-password" placeholder="Repeat new password" minlength="6" required style="width:100%" />
      </div>

      <div id="reset-error" style="color:var(--color-error); font-size:13px; display:none;"></div>

      <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-reset" style="width:100%;">
        Save New Password
      </button>
    </form>
  `;

  const form = container.querySelector('#form-reset') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = (container.querySelector('#new-password') as HTMLInputElement).value;
    const confPass = (container.querySelector('#confirm-password') as HTMLInputElement).value;
    const errEl = container.querySelector('#reset-error') as HTMLElement;

    if (newPass !== confPass) {
      errEl.textContent = 'Passwords do not match';
      errEl.style.display = 'block';
      return;
    }

    try {
      await authState.resetPassword(pendingEmail, 'verified', newPass);
      events.emit('notify', { type: 'success', title: 'Password Updated', message: 'You can now sign in with your new password.' });
      currentView = 'login';
      renderAuthView();
    } catch (err: any) {
      errEl.textContent = err.message || 'Reset failed';
      errEl.style.display = 'block';
    }
  });
}

/**
 * 6. USER PROFILE VIEW
 */
function renderProfileView(container: HTMLElement): void {
  const user = authState.getUser();
  if (!user) {
    currentView = 'login';
    renderAuthView();
    return;
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:20px; padding-top:12px;">
      <div style="width:64px; height:64px; margin:0 auto 12px; background:linear-gradient(135deg, var(--color-primary), #7c3aed); color:white; font-size:22px; font-weight:700; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-md);">
        ${initials}
      </div>
      <h2 style="font-size:20px; font-weight:700; color:var(--color-text); margin:0;">${user.name}</h2>
      <p style="font-size:13px; color:var(--color-text-secondary); margin-top:2px;">${user.email}</p>
      <div style="display:inline-block; margin-top:6px; font-size:11px; padding:2px 8px; border-radius:12px; background:rgba(16,185,129,0.15); color:#059669; font-weight:600;">
        ✓ Verified Account
      </div>
    </div>

    <div style="background:var(--color-surface-secondary); padding:16px; border-radius:var(--radius-lg); margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:13px; color:var(--color-text-secondary);">User ID</span>
        <span style="font-family:var(--font-mono); font-size:12px; color:var(--color-text); font-weight:600;">${user.id}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:13px; color:var(--color-text-secondary);">Total Processed Cutouts</span>
        <span style="font-size:13px; color:var(--color-text); font-weight:700;">${user.stats?.totalImages || 0}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:var(--color-text-secondary);">Storage Used</span>
        <span style="font-size:13px; color:var(--color-text); font-weight:700;">${formatBytes(user.stats?.totalBytes || 0)}</span>
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="btn btn-secondary btn-danger" id="btn-logout" style="width:100%;">
        Sign Out
      </button>
    </div>
  `;

  container.querySelector('#btn-logout')?.addEventListener('click', () => {
    authState.logout();
    events.emit('notify', { type: 'info', title: 'Signed Out', message: 'You have been signed out.' });
    closeAuthModal();
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
