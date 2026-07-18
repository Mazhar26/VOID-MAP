// ─── App Entry Point ─────────────────────────────────────────────────────────
import './style.css';
import { route, initRouter } from './router.js';
import { homePage } from './pages/home.js';
import { loginPage } from './pages/login.js';
import { mapPage } from './pages/map.js';
import { adminPage } from './pages/admin.js';

// ─── Route Definitions ────────────────────────────────────────────────────────
route('#/', homePage);
route('#/login', loginPage);
route('#/map', mapPage);
route('#/admin', adminPage, { requireAuth: true, requireAdmin: true });

// ─── Start ────────────────────────────────────────────────────────────────────
initRouter();
