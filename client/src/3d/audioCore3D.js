// ─── 3D WebGL Audio Core Visualizer (Three.js - ZapConnect Theme) ───────────
// Interactive 3D metallic/glass sphere with orbiting particle halo.
// Vertices distort dynamically based on live microphone RMS sound levels.

import * as THREE from 'three';

/**
 * Initialize 3D WebGL Audio Core visualizer inside container element.
 * @param {HTMLElement} container - DOM element to mount the canvas
 * @returns {{ updateRMS: (rms: number) => void, dispose: () => void }}
 */
export function initAudioCore3D(container) {
  if (!container) return { updateRMS: () => {}, dispose: () => {} };

  // ─── Scene Setup ─────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  
  const width = container.clientWidth || 340;
  const height = container.clientHeight || 340;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // ─── Lights ──────────────────────────────────────────────────────────────────
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const orangeLight = new THREE.PointLight(0xff5c00, 5, 12);
  orangeLight.position.set(2, 3, 4);
  scene.add(orangeLight);

  const limeLight = new THREE.PointLight(0xb5ff36, 4, 12);
  limeLight.position.set(-2, -3, -2);
  scene.add(limeLight);

  // ─── Core Mesh (Icosahedron) ──────────────────────────────────────────────────
  const baseRadius = 1.25;
  const geometry = new THREE.IcosahedronGeometry(baseRadius, 3);
  
  // Store original vertex positions for displacement calculations
  const posAttribute = geometry.attributes.position;
  const originalPositions = new Float32Array(posAttribute.array.length);
  originalPositions.set(posAttribute.array);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x120a05,
    emissive: 0x3d1400,
    roughness: 0.1,
    metalness: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    wireframe: false,
    flatShading: true,
  });

  const coreMesh = new THREE.Mesh(geometry, material);
  scene.add(coreMesh);

  // Wireframe outer shell for cyber aesthetic
  const wireGeometry = new THREE.IcosahedronGeometry(baseRadius * 1.06, 2);
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0xff5c00,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  const wireShell = new THREE.Mesh(wireGeometry, wireMaterial);
  scene.add(wireShell);

  // ─── Particle Ring Halo ──────────────────────────────────────────────────────
  const particleCount = 250;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);

  const colorPalette = [
    new THREE.Color(0xff5c00), // ZapConnect Orange
    new THREE.Color(0xb5ff36), // Electric Lime
    new THREE.Color(0xff8c00), // Amber
    new THREE.Color(0x00d2ff), // Cyan
  ];

  for (let i = 0; i < particleCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = baseRadius * (1.5 + Math.random() * 0.9);

    particlePositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = r * Math.cos(phi);

    const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    particleColors[i * 3]     = c.r;
    particleColors[i * 3 + 1] = c.g;
    particleColors[i * 3 + 2] = c.b;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // ─── Interaction & Animation State ──────────────────────────────────────────
  let targetRMS = 0.02;
  let currentRMS = 0.02;
  let animationFrameId = null;
  let mouseX = 0;
  let mouseY = 0;

  const onMouseMove = (event) => {
    const rect = container.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  container.addEventListener('mousemove', onMouseMove);

  // ─── Animation Loop ──────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    
    // Smoothly interpolate RMS value
    currentRMS += (targetRMS - currentRMS) * 0.1;

    // Rotate meshes
    const rotSpeed = 0.4 + currentRMS * 3.0;
    coreMesh.rotation.x += 0.005 * rotSpeed;
    coreMesh.rotation.y += 0.008 * rotSpeed;

    wireShell.rotation.x -= 0.003 * rotSpeed;
    wireShell.rotation.y -= 0.006 * rotSpeed;

    particles.rotation.y += 0.002 * rotSpeed;
    particles.rotation.z += 0.001 * rotSpeed;

    // Parallax tilt tracking
    camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
    camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    // Deform vertices according to RMS sound intensity
    const positions = posAttribute.array;
    const freq = 3.0 + currentRMS * 10.0;
    const amp = 0.05 + currentRMS * 1.5;

    for (let i = 0; i < positions.length; i += 3) {
      const ox = originalPositions[i];
      const oy = originalPositions[i + 1];
      const oz = originalPositions[i + 2];

      const noise = Math.sin(ox * freq + elapsedTime * 4) *
                    Math.cos(oy * freq + elapsedTime * 4) *
                    Math.sin(oz * freq + elapsedTime * 4);

      const scale = 1 + noise * amp * 0.35;

      positions[i]     = ox * scale;
      positions[i + 1] = oy * scale;
      positions[i + 2] = oz * scale;
    }

    posAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    // Pulse lights dynamically with decibel energy
    orangeLight.intensity = 3.0 + Math.sin(elapsedTime * 5) * 2.0 + currentRMS * 12;
    limeLight.intensity = 2.5 + Math.cos(elapsedTime * 5) * 2.0 + currentRMS * 12;

    renderer.render(scene, camera);
  }

  animate();

  // ─── Resize Handler ──────────────────────────────────────────────────────────
  const onResize = () => {
    const w = container.clientWidth || 340;
    const h = container.clientHeight || 340;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener('resize', onResize);

  // ─── Public API ──────────────────────────────────────────────────────────────
  return {
    updateRMS(rms) {
      targetRMS = Math.max(0.01, Math.min(rms, 1.0));
    },
    dispose() {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      wireGeometry.dispose();
      wireMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}
