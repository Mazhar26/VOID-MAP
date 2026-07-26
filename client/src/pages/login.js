// ─── Login Page ───────────────────────────────────────────────────────────────
// Two-step auth: email → OTP → JWT
// Step 1: user enters Gmail → we call /api/auth/login or /api/auth/signup
// Step 2: user enters OTP → we call /api/auth/verify-otp → store JWT

import { api } from '../api.js';
import { navigateTo } from '../router.js';

export async function loginPage() {
  const el = document.createElement('div');
  el.className = 'container';
  el.innerHTML = `
    <nav class="hs-nav" aria-label="Main Navigation">
      <a href="#/" class="hs-brand">
        <span style="font-size:1.4rem;">🌙</span> VOID-MAP
      </a>
      <div class="hs-nav-links">
        <a href="#/" class="hs-nav-link">Home</a>
        <a href="#/map" class="hs-nav-link">Map</a>
      </div>
    </nav>

    <div class="hs-hero" style="padding-bottom:1rem;">
      <h1 class="hs-hero-title" style="font-size:clamp(2rem, 5vw, 3rem);">Sign In to VOID-MAP</h1>
      <p class="hs-hero-subtitle" style="font-size:1rem;margin-bottom:1.5rem;">Enter your Gmail address to unlock full map access & pin quiet spots</p>
    </div>

    <div class="auth-form" id="authForm">
      <!-- Step 1: Email -->
      <form id="step-email">
        <input
          id="emailInput"
          class="input-field"
          type="email"
          placeholder="your@gmail.com"
          autocomplete="email"
          aria-label="Gmail address"
          required
        >
        <button id="emailBtn" type="submit" class="btn-primary">Continue</button>
        <p id="authMsg" class="status-msg" style="margin-top:0.5rem;"></p>
      </form>

      <!-- Step 2: OTP (hidden until email submitted) -->
      <form id="step-otp" style="display:none;">
        <p class="status-msg success" style="margin-bottom:0.5rem;">
          ✅ OTP sent — check your email inbox (or server terminal window)
        </p>
        <input
          id="otpInput"
          class="input-field"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="6-digit code"
          autocomplete="one-time-code"
          aria-label="One-time password"
          required
        >
        <label class="checkbox-row" for="stayLoggedIn">
          <input type="checkbox" id="stayLoggedIn">
          Stay logged in for 30 days
        </label>
        <button id="otpBtn" type="submit" class="btn-primary">Verify</button>
        <button id="backBtn" type="button" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:0.8rem;cursor:pointer;margin-top:0.3rem;width:100%;text-align:center;">
          ← Use a different email
        </button>
        <p id="otpMsg" class="status-msg" style="margin-top:0.5rem;"></p>
      </form>
    </div>

    <div class="footer">
      <a href="#/">Home</a>
      <a href="#/map">Map</a>
    </div>
  `;

  // ─── State ────────────────────────────────────────────────────────────────
  let currentEmail = '';
  let isNewUser = false;

  // ─── Step 1: Email submit ─────────────────────────────────────────────────
  const emailInput = el.querySelector('#emailInput');
  const emailBtn   = el.querySelector('#emailBtn');
  const authMsg    = el.querySelector('#authMsg');
  const stepEmail  = el.querySelector('#step-email');
  const stepOtp    = el.querySelector('#step-otp');

  stepEmail.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();

    if (!email.endsWith('@gmail.com')) {
      authMsg.textContent = '⚠️ Only Gmail addresses are allowed.';
      authMsg.className = 'status-msg error';
      return;
    }

    emailBtn.disabled = true;
    emailBtn.textContent = 'Sending…';
    authMsg.textContent = '';

    try {
      // Try login first — if 404, fall back to signup
      try {
        await api.login(email);
        isNewUser = false;
      } catch (loginErr) {
        if (loginErr.message.includes('No account found')) {
          await api.signup(email);
          isNewUser = true;
        } else {
          throw loginErr;
        }
      }

      currentEmail = email;
      stepEmail.style.display = 'none';
      stepOtp.style.display = '';
      el.querySelector('#otpInput').focus();

    } catch (err) {
      authMsg.textContent = `⚠️ ${err.message}`;
      authMsg.className = 'status-msg error';
      emailBtn.disabled = false;
      emailBtn.textContent = 'Continue';
    }
  });

  // ─── Step 2: OTP verify ───────────────────────────────────────────────────
  const otpInput = el.querySelector('#otpInput');
  const otpBtn   = el.querySelector('#otpBtn');
  const otpMsg   = el.querySelector('#otpMsg');

  stepOtp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = otpInput.value.trim();
    const stayLoggedIn = el.querySelector('#stayLoggedIn').checked;

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      otpMsg.textContent = '⚠️ Please enter the 6-digit code from your email.';
      otpMsg.className = 'status-msg error';
      return;
    }

    otpBtn.disabled = true;
    otpBtn.textContent = 'Verifying…';
    otpMsg.textContent = '';

    try {
      const { token, user } = await api.verifyOTP(currentEmail, otp, stayLoggedIn);

      // Store auth state
      localStorage.setItem('voidmap_token', token);
      localStorage.setItem('voidmap_user', JSON.stringify(user));

      // Redirect admin to dashboard, regular users to home
      navigateTo(user.isAdmin ? '#/admin' : '#/');

    } catch (err) {
      otpMsg.textContent = `⚠️ ${err.message}`;
      otpMsg.className = 'status-msg error';
      otpBtn.disabled = false;
      otpBtn.textContent = 'Verify';
    }
  });

  // Back button
  el.querySelector('#backBtn').addEventListener('click', () => {
    stepOtp.reset();
    stepOtp.style.display = 'none';
    stepEmail.style.display = '';
    emailBtn.disabled = false;
    emailBtn.textContent = 'Continue';
  });

  return el;
}
