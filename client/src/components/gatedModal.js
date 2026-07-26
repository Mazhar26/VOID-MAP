// ─── Gated Access Glass Modal (Handshake AI Style) ────────────────────────────
// Triggers a sleek glassmorphism modal overlay prompting guests to sign in with Gmail.

import { escapeHtml } from '../lib/escape.js';
import { navigateTo } from '../router.js';

/**
 * Show the gated feature access modal.
 * @param {string} title - Modal title (e.g. "Unlock Full Map Access")
 * @param {string} message - Description message
 */
export function showGatedModal(title = 'Unlock Full Access', message = 'Sign in with your Gmail address to explore community quiet spots, save custom pins, and earn badges.') {
  // Prevent duplicate modals
  const existing = document.querySelector('.hs-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'hs-modal-overlay';
  overlay.innerHTML = `
    <div class="hs-modal-card">
      <div style="font-size:3rem;margin-bottom:1rem;">🌙</div>
      <h2 style="font-size:1.6rem;font-weight:800;color:#fff;margin-bottom:0.6rem;">${escapeHtml(title)}</h2>
      <p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.5;margin-bottom:1.8rem;">${escapeHtml(message)}</p>
      
      <div style="display:flex;flex-direction:column;gap:0.8rem;">
        <button id="hsModalLoginBtn" class="zap-btn" style="width:100%;padding:0.9rem;font-size:0.95rem;">
          🔑 SIGN IN WITH GMAIL
        </button>
        <button id="hsModalCloseBtn" style="background:none;border:none;color:var(--text-muted);font-size:0.82rem;cursor:pointer;padding:0.4rem;">
          Maybe later
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#hsModalLoginBtn')?.addEventListener('click', () => {
    overlay.remove();
    navigateTo('#/login');
  });

  overlay.querySelector('#hsModalCloseBtn')?.addEventListener('click', () => {
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
