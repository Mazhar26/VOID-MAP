// ─── Landing Page — Expanded Multi-Section VOID-MAP Showcase ──────────────────
// Public marketing landing page for VOID-MAP (#/)

import { navigateTo } from '../router.js';

export function landingPage() {
  const el = document.createElement('div');
  el.className = 'landing-outer-frame';
  el.setAttribute('role', 'main');

  el.innerHTML = `
    <div class="landing-inner-card">
      <!-- Top Navigation Bar -->
      <header class="landing-nav-header">
        <div class="landing-logo">VOID MAP</div>

        <div class="landing-nav-right">
          <nav class="landing-nav-pill" aria-label="Main Navigation">
            <a href="#/" class="landing-nav-link active">Home</a>
            <a href="#/map" class="landing-nav-link">Map</a>
            <a href="#/" class="landing-nav-link" id="sanctuaryPlaceholder">Sanctuary</a>
          </nav>

          <a href="#/try" class="landing-try-btn" id="tryNowBtn">
            TRY NOW
          </a>
        </div>
      </header>

      <!-- Section 1: Hero Stage -->
      <section class="landing-hero-stage">
        <!-- Pure CSS Black Hole Visual -->
        <div class="landing-black-hole" aria-hidden="true"></div>

        <!-- Floating Orange Pulse Dot -->
        <div class="landing-pulse-dot" aria-hidden="true"></div>

        <!-- Massive Black Typography -->
        <h1 class="landing-hero-bg-text">VOI<span style="color:#ffffff;">D</span> <span style="color:#ffffff;">M</span>AP</h1>

        <!-- Bottom-Right Caption -->
        <div class="landing-bottom-caption">VOID-MAP · SANCTUARY 01</div>
      </section>

      <!-- Section 2: About / Overview & Key Specs List -->
      <section class="landing-overview-section">
        <div class="landing-split-layout">
          <!-- Left: 3D Orb Visual -->
          <div class="landing-visual-wrapper">
            <div class="landing-3d-orb">
              <div class="orb-core"></div>
              <div class="orb-badge">01</div>
            </div>
          </div>

          <!-- Right: Title, Tagline, Paragraph, CTA -->
          <div class="landing-overview-content">
            <h2 class="jp-title">ヴォイドマップ・サンクチュアリ</h2>
            <h3 class="en-title">VOID-MAP Sanctuary</h3>
            <p class="jp-tagline">静寂とデジタルの融合により、都市の騒音から離れたプライバシー重視の静寂マップを作成します。</p>
            <p class="en-tagline">VOID-MAP is a state-of-the-art privacy-first spatial acoustic mapping platform that combines acoustic sensing and transient geohash indexing, perfect for finding quiet spots in busy cities.</p>
            
            <a href="#/try" class="landing-overview-cta">GET STARTED</a>
          </div>
        </div>
      </section>

      <!-- Section 3: Dual Marquee Banner -->
      <div class="landing-marquee-wrapper">
        <div class="landing-marquee marquee-red">
          <div class="marquee-content">
            <span>機械と未来主義の融合 • Fusion of Silence and Technology • 静寂とデジタルの融合 • Privacy-First Noise Mapping • </span>
            <span>機械と未来主義の融合 • Fusion of Silence and Technology • 静寂とデジタルの融合 • Privacy-First Noise Mapping • </span>
          </div>
        </div>
        <div class="landing-marquee marquee-lime">
          <div class="marquee-content reverse">
            <span>• Fusion of Mechanics and Futurism • 静寂の発見と共有 • Real-Time Decibel Indexing • Transient Acoustic Map</span>
            <span>• Fusion of Mechanics and Futurism • 静寂の発見と共有 • Real-Time Decibel Indexing • Transient Acoustic Map</span>
          </div>
        </div>
      </div>

      <!-- Section 4: 3 Key Points Cards Section -->
      <section class="landing-keypoints-section">
        <div class="keypoints-header">
          <div class="jp-key-title">三つの重要なポイント </div>
          <h2 class="en-key-title">3 KEY POINTS</h2>
        </div>

            <div class="keypoints-grid">
          <!-- Card 001: Ephemeral Privacy -->
          <div class="keypoint-card">
            <div class="card-num">001</div>
            <h3 class="card-title">Ephemeral Privacy</h3>
            <div class="card-3d-visual visual-privacy">
              <div class="privacy-core"></div>
              <div class="privacy-ring"></div>
            </div>
            <button class="card-dropdown-toggle" aria-expanded="false">
              <span>Learn More</span>
              <span class="dropdown-arrow">▾</span>
            </button>
            <div class="card-dropdown-content">
              <p class="card-en-explain">
                Every sound reading collected by VOID-MAP automatically purges after 30 minutes. We never store raw audio recordings or user identifiers—ensuring complete digital anonymity.
              </p>
            </div>
          </div>

          <!-- Card 002: Spatial Precision -->
          <div class="keypoint-card">
            <div class="card-num">002</div>
            <h3 class="card-title">Spatial Precision</h3>
            <div class="card-3d-visual visual-precision">
              <div class="radar-sweep"></div>
              <div class="target-dot"></div>
            </div>
            <button class="card-dropdown-toggle" aria-expanded="false">
              <span>Learn More</span>
              <span class="dropdown-arrow">▾</span>
            </button>
            <div class="card-dropdown-content">
              <p class="card-en-explain">
                Our high-resolution sub-geohash grid maps noise intensity down to neighborhood sub-kilometers. Users can discover micro-sanctuaries with pinpoint decibel accuracy.
              </p>
            </div>
          </div>

          <!-- Card 003: Integrated Soundscape -->
          <div class="keypoint-card">
            <div class="card-num">003</div>
            <h3 class="card-title">Integrated Soundscape</h3>
            <div class="card-3d-visual visual-soundscape">
              <div class="eq-bar bar1"></div>
              <div class="eq-bar bar2"></div>
              <div class="eq-bar bar3"></div>
              <div class="eq-bar bar4"></div>
              <div class="eq-bar bar5"></div>
            </div>
            <button class="card-dropdown-toggle" aria-expanded="false">
              <span>Learn More</span>
              <span class="dropdown-arrow">▾</span>
            </button>
            <div class="card-dropdown-content">
              <p class="card-en-explain">
                Powered by browser-native Web Audio APIs, VOID-MAP analyzes sound frequency spectra locally in real-time without sending audio buffers to external servers.
              </p>
            </div>
          </div>
        </div>



      <!-- Key Specs Checklist (001, 002, 003) -->
        <div class="landing-specs-list">
          <div class="spec-row">
            <span class="spec-text">001 : Ephemeral Privacy - 30分毎の自動消滅データ保護と匿名化システム・</span>
          </div>
          <div class="spec-row">
            <span class="spec-text">002 : Spatial Precision - サブジオハッシュ精度による高解像度デシベル測定・</span>
          </div>
          <div class="spec-row">
            <span class="spec-text">003 : Integrated Technology - ブラウザ完結型の高度な音響解析エンジンを装備・</span>
          </div>
        </div>
      </section>

      <!-- Section 5: Showcase / Feature Detail -->
      <section class="landing-detail-section">
        <div class="landing-split-layout">
          <!-- Left: 3D Orb Visual -->
          <div class="landing-visual-wrapper">
            <div class="landing-3d-orb main-orb">
              <div class="orb-core glow-core"></div>
            </div>
          </div>

          <!-- Right: Detailed Tech Description + Yellow CTA -->
          <div class="landing-overview-content">
            <p class="jp-desc">ヴォイドマップ・サンクチュアリは、強固なプライバシー暗号化と最新の音響空間技術を組み合わせています。強力なオーディオエンジンが優れた精度を発揮し、一時的なデータ消去が未来的な安心感をもたらします。</p>
            <p class="en-desc">VOID-MAP Sanctuary combines strong privacy encryption with modern acoustic spatial technology. Its powerful audio engine ensures high accuracy, while ephemeral purging brings a futuristic peace of mind. The stylish interface and innovative soundscape work together, making it a perfect blend of silence and technology.</p>

            <a href="#/try" class="landing-yellow-cta">TRY NOW</a>
          </div>
        </div>
      </section>
    </div>
  `;

  // Event Listeners
  el.querySelector('#sanctuaryPlaceholder')?.addEventListener('click', (e) => {
    e.preventDefault();
    const overviewEl = el.querySelector('.landing-overview-section');
    overviewEl?.scrollIntoView({ behavior: 'smooth' });
  });

  // Card Dropdown Toggle Handler
  el.querySelectorAll('.card-dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.keypoint-card');
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';

      btn.setAttribute('aria-expanded', !isExpanded);
      card.classList.toggle('is-open', !isExpanded);
      btn.querySelector('.dropdown-arrow').style.transform = !isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  });

  return el;
}
