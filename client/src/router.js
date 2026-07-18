// ─── Client-Side Router ───────────────────────────────────────────────────────
// Hash-based routing — no server config needed.
// Routes: #/ (home), #/map, #/login, #/admin
//
// Auth guard: protected routes redirect to #/login if no token.
// Admin guard: #/admin redirects to #/ if user is not admin.

const routes = {};
const app = document.getElementById('app');

/**
 * Register a route handler.
 * @param {string} path - e.g. '#/'
 * @param {Function} handler - async function that returns an HTML string or DOM node
 * @param {object} options - { requireAuth: bool, requireAdmin: bool }
 */
export function route(path, handler, options = {}) {
  routes[path] = { handler, options };
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('voidmap_user'));
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem('voidmap_token');
}

async function navigate() {
  const hash = window.location.hash || '#/';
  const matched = routes[hash] || routes['#/'];
  const { handler, options } = matched;

  // Auth guard
  if (options.requireAuth && !isLoggedIn()) {
    window.location.hash = '#/login';
    return;
  }

  // Admin guard
  if (options.requireAdmin) {
    const user = getUser();
    if (!user || !user.isAdmin) {
      window.location.hash = '#/';
      return;
    }
  }

  // Redirect logged-in users away from login page
  if (hash === '#/login' && isLoggedIn()) {
    window.location.hash = '#/';
    return;
  }

  try {
    app.innerHTML = '<div style="text-align:center;padding:4rem;color:rgba(255,255,255,0.4);">Loading…</div>';
    const result = await handler();

    // Support two return shapes:
    // 1. HTMLElement or string — attach directly
    // 2. { el: HTMLElement, afterMount: async fn } — attach el, THEN call afterMount
    let el = result;
    let afterMount = null;

    if (result && result.el instanceof Node) {
      el = result.el;
      afterMount = result.afterMount || null;
    }

    if (typeof el === 'string') {
      app.innerHTML = el;
    } else if (el instanceof Node) {
      app.innerHTML = '';
      app.appendChild(el);
    }

    // afterMount runs AFTER the element is in the DOM (needed for Leaflet)
    if (typeof afterMount === 'function') {
      await afterMount();
    }
  } catch (err) {
    console.error('[router] Page error:', err);
    app.innerHTML = `<div class="container" role="main"><p style="color:#ff6b8a;text-align:center;">⚠️ ${err.message}</p></div>`;
  }
}

export function initRouter() {
  window.addEventListener('hashchange', navigate);
  navigate(); // render current route on load
}

/** Programmatically navigate to a route */
export function navigateTo(hash) {
  window.location.hash = hash;
}
