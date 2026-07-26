// ─── OTP Service ─────────────────────────────────────────────────────────────
// Generates, hashes, and emails 6-digit OTP codes.
// OTPs are never stored plaintext — only bcrypt hashes go to the DB.

import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { Resend } from 'resend';
import { config } from '../config/env.js';

const resend = new Resend(config.RESEND_API_KEY);

/**
 * Generate a cryptographically random 6-digit OTP string.
 * We use Math.random here — for a 6-digit code this is sufficient
 * (brute force is blocked by the auth rate limiter and 5-min expiry).
 * @returns {string} e.g. "482931"
 */
export function generateOTP() {
  // ponytail: crypto.randomInt is CSPRNG, no new dep needed
  return String(randomInt(100000, 1000000));
}

/**
 * Hash an OTP with bcrypt.
 * Salt rounds = 10 (fast enough for OTP use, not a user password).
 * @param {string} otp
 * @returns {Promise<string>} bcrypt hash
 */
export async function hashOTP(otp) {
  return bcrypt.hash(otp, 10);
}

/**
 * Compare a plaintext OTP against its stored hash.
 * @param {string} otp
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyOTP(otp, hash) {
  return bcrypt.compare(otp, hash);
}

/**
 * Send an OTP email via Resend.
 * @param {string} email - recipient
 * @param {string} otp   - plaintext 6-digit code
 */
export async function sendOTP(email, otp) {
  const expiryMinutes = config.OTP_EXPIRY_MINUTES;

  if (config.NODE_ENV === 'test') {
    console.log(`[otp] (TEST) Mock email sent to ${email} containing verification OTP: ${otp}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: config.FROM_EMAIL,
    to: email,
    subject: '🌙 Your VOID-MAP verification code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background: #020308; color: #fff; margin: 0; padding: 0; }
          .wrapper { max-width: 480px; margin: 40px auto; padding: 40px 32px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; }
          .logo { font-size: 2rem; text-align: center; margin-bottom: 8px; }
          h1 { font-size: 1.4rem; font-weight: 500; text-align: center; margin: 0 0 8px; }
          .subtitle { font-size: 0.9rem; color: rgba(255,255,255,0.6); text-align: center; margin-bottom: 32px; }
          .otp-box { background: rgba(255,215,100,0.06); border: 1px solid rgba(255,215,100,0.3); border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 24px; }
          .otp-code { font-size: 2.8rem; font-weight: 700; letter-spacing: 0.3em; color: #ffd764; }
          .expiry { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
          .footer { font-size: 0.75rem; color: rgba(255,255,255,0.3); text-align: center; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="logo">🌙</div>
          <h1>VOID-MAP</h1>
          <p class="subtitle">Your one-time verification code</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="expiry">Expires in ${expiryMinutes} minutes</div>
          </div>
          <p class="footer">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error('[otp] Resend API notice:', error.message || error);
    if (config.NODE_ENV === 'development') {
      console.log(`\n======================================================`);
      console.log(`🔑 [DEV MODE OTP RECOVERY]`);
      console.log(`   Recipient: ${email}`);
      console.log(`   OTP Code:  ${otp}`);
      console.log(`   Use this 6-digit code on the sign-in form!`);
      console.log(`======================================================\n`);
      return; // Return successfully in dev mode so testing is never blocked
    }
    throw new Error(`Failed to send OTP email: ${error.message || 'Resend API error'}`);
  }
}
