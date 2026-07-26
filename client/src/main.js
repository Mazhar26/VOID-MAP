// ─── App Entry Point ─────────────────────────────────────────────────────────
import './style.css';
import { route, initRouter } from './router.js';
import { landingPage } from './pages/landing.js';
import { tryPage } from './pages/try.js';
import { homePage } from './pages/home.js';
import { loginPage } from './pages/login.js';
import { mapPage } from './pages/map.js';
import { adminPage } from './pages/admin.js';

// ─── 3-Tier Route Definitions ────────────────────────────────────────────────
route('#/', landingPage);
route('#/try', tryPage);
route('#/login', loginPage);
route('#/home', homePage, { requireAuth: true });
route('#/map', mapPage, { requireAuth: true });
route('#/admin', adminPage, { requireAuth: true, requireAdmin: true });

// ─── Start ────────────────────────────────────────────────────────────────────
initRouter();
