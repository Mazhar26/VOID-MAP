// ─── App Entry Point ─────────────────────────────────────────────────────────
import './style.css';
import { route, initRouter } from './router.js';
import { landingPage } from './pages/landing.js';
import { tryPage } from './pages/try.js';
import { homePage } from './pages/home.js';
import { loginPage } from './pages/login.js';
import { mapPage } from './pages/map.js';
import { adminPage } from './pages/admin.js';
import { initRibbonCursor } from './lib/ribbonCursor.js';

// ─── 3-Tier Route Definitions ────────────────────────────────────────────────
route('#/', landingPage);
route('#/try', tryPage);
route('#/login', loginPage);
route('#/home', homePage, { requireAuth: true });
route('#/map', mapPage, { requireAuth: true });
route('#/admin', adminPage, { requireAuth: true, requireAdmin: true });

// ─── Start ────────────────────────────────────────────────────────────────────
initRouter();

// 2. Activate Ribbon Trail Cursor
initRibbonCursor({
    colors: ['#F24E1E', '#ff8a3d', '#ffffff'],
    trails: 40,
    thickness: 2,
});