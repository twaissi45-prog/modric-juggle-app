// ============================================
// 3D Soccer Ball — Proper Football with
// Black Pentagons, White Hexagons, Seams
// Juggling bounce physics + interactive
// ============================================

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// --- Icosahedron vertices (12) → pentagon centers on soccer ball ---
const PHI = (1 + Math.sqrt(5)) / 2;
const ICOSA_VERTS = [
  [0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI],
  [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0],
  [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1],
].map(v => {
  const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  return [v[0] / len, v[1] / len, v[2] / len];
});

// --- Create authentic soccer ball texture ---
function createSoccerTexture(resolution = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');

  // White leather base
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, resolution, resolution);

  // Subtle leather grain
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * resolution;
    const y = Math.random() * resolution;
    const gray = 230 + Math.random() * 20;
    ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, 0.15)`;
    ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
  }

  // For each pixel, compute 3D position on sphere, then check
  // proximity to icosahedron vertices (pentagon centers)
  const imageData = ctx.getImageData(0, 0, resolution, resolution);
  const data = imageData.data;

  // Pentagon angular radius on unit sphere (approx 20.9° → radians)
  const pentRadius = 0.37; // angular distance threshold
  const seamWidth = 0.025; // seam line width

  // Midpoints between adjacent icosahedron vertices → hexagon centers
  const hexCenters = [];
  for (let i = 0; i < ICOSA_VERTS.length; i++) {
    for (let j = i + 1; j < ICOSA_VERTS.length; j++) {
      const [x1, y1, z1] = ICOSA_VERTS[i];
      const [x2, y2, z2] = ICOSA_VERTS[j];
      const dot = x1 * x2 + y1 * y2 + z1 * z2;
      // Adjacent vertices have dot product ≈ 0.447
      if (dot > 0.3 && dot < 0.6) {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, mz = (z1 + z2) / 2;
        const len = Math.sqrt(mx * mx + my * my + mz * mz);
        hexCenters.push([mx / len, my / len, mz / len]);
      }
    }
  }

  for (let py = 0; py < resolution; py++) {
    // latitude: v=0 → bottom, v=1 → top
    const v = py / resolution;
    const lat = (v - 0.5) * Math.PI; // -π/2 to π/2

    for (let px = 0; px < resolution; px++) {
      // longitude: u=0 → front, u=1 → front (wraps)
      const u = px / resolution;
      const lon = u * 2 * Math.PI;

      // 3D point on unit sphere
      const sx = Math.cos(lat) * Math.sin(lon);
      const sy = -Math.sin(lat); // flip for texture coords
      const sz = Math.cos(lat) * Math.cos(lon);

      // Distance to nearest pentagon center
      let minPentDist = Infinity;
      for (const [vx, vy, vz] of ICOSA_VERTS) {
        const dot = Math.min(1, Math.max(-1, sx * vx + sy * vy + sz * vz));
        const dist = Math.acos(dot);
        if (dist < minPentDist) minPentDist = dist;
      }

      // Distance to nearest hexagon center
      let minHexDist = Infinity;
      for (const [hx, hy, hz] of hexCenters) {
        const dot = Math.min(1, Math.max(-1, sx * hx + sy * hy + sz * hz));
        const dist = Math.acos(dot);
        if (dist < minHexDist) minHexDist = dist;
      }

      const idx = (py * resolution + px) * 4;

      // Black pentagon fill
      if (minPentDist < pentRadius) {
        // Pentagon interior — dark charcoal/black
        const edgeFade = Math.max(0, 1 - (pentRadius - minPentDist) / 0.03);
        const base = 20 + edgeFade * 180;
        data[idx] = base;
        data[idx + 1] = base;
        data[idx + 2] = base + edgeFade * 10;
      }

      // Seam lines (between panels)
      // Seam appears where the point is roughly equidistant from two panel centers
      const nearEdge = Math.abs(minPentDist - pentRadius);
      const nearHexEdge = Math.abs(minHexDist - pentRadius * 0.85);

      if (nearEdge < seamWidth || nearHexEdge < seamWidth) {
        const seamStrength = nearEdge < seamWidth
          ? 1 - nearEdge / seamWidth
          : 1 - nearHexEdge / seamWidth;
        const s = seamStrength * 0.4;
        data[idx] = Math.round(data[idx] * (1 - s) + 160 * s);
        data[idx + 1] = Math.round(data[idx + 1] * (1 - s) + 155 * s);
        data[idx + 2] = Math.round(data[idx + 2] * (1 - s) + 150 * s);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// --- Create bump map for seam indentations ---
function createBumpTexture(resolution = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#808080'; // neutral gray = flat
  ctx.fillRect(0, 0, resolution, resolution);

  const imageData = ctx.getImageData(0, 0, resolution, resolution);
  const data = imageData.data;
  const pentRadius = 0.37;

  for (let py = 0; py < resolution; py++) {
    const v = py / resolution;
    const lat = (v - 0.5) * Math.PI;
    for (let px = 0; px < resolution; px++) {
      const u = px / resolution;
      const lon = u * 2 * Math.PI;
      const sx = Math.cos(lat) * Math.sin(lon);
      const sy = -Math.sin(lat);
      const sz = Math.cos(lat) * Math.cos(lon);

      let minDist = Infinity;
      for (const [vx, vy, vz] of ICOSA_VERTS) {
        const dot = Math.min(1, Math.max(-1, sx * vx + sy * vy + sz * vz));
        const dist = Math.acos(dot);
        if (dist < minDist) minDist = dist;
      }

      const idx = (py * resolution + px) * 4;
      const nearEdge = Math.abs(minDist - pentRadius);

      if (nearEdge < 0.04) {
        // Indent at seam
        const depth = (1 - nearEdge / 0.04) * 40;
        const val = 128 - depth;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// ============================================
// Main Component
// ============================================
export default function Football3D({
  size = 200,
  spin = true,
  bounce = true,
  interactive = false,
  glow = true,
  juggle = false,
}) {
  const containerRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const w = size;
    const h = size;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.2, 3.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // --- SOCCER BALL ---
    const texRes = size > 100 ? 1024 : 512;
    const ballTexture = createSoccerTexture(texRes);
    ballTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const bumpMap = createBumpTexture(512);

    const ballGeo = new THREE.SphereGeometry(0.85, 64, 48);
    const ballMat = new THREE.MeshPhysicalMaterial({
      map: ballTexture,
      bumpMap: bumpMap,
      bumpScale: 0.015,
      roughness: 0.35,
      metalness: 0.0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.15,
      sheen: 0.3,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xf5f5f5),
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    scene.add(ball);

    // --- GLOW RING (orbit ring around ball) ---
    let ring = null;
    if (glow) {
      const ringGeo = new THREE.TorusGeometry(1.12, 0.008, 8, 100);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xD4AF37,
        transparent: true,
        opacity: 0.3,
      });
      ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.42;
      ring.rotation.z = Math.PI * 0.08;
      scene.add(ring);

      // Second faint ring
      const ring2Geo = new THREE.TorusGeometry(1.25, 0.005, 8, 80);
      const ring2Mat = new THREE.MeshBasicMaterial({
        color: 0xD4AF37,
        transparent: true,
        opacity: 0.1,
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.x = Math.PI * 0.55;
      ring2.rotation.z = -Math.PI * 0.12;
      scene.add(ring2);
    }

    // --- LIGHTING (stadium-style 3-point) ---
    // Key light — warm top-left (sun/stadium light)
    const keyLight = new THREE.DirectionalLight(0xFFF4E0, 1.4);
    keyLight.position.set(-3, 4, 3);
    scene.add(keyLight);

    // Fill light — cool blue from right
    const fillLight = new THREE.DirectionalLight(0xB0D4FF, 0.5);
    fillLight.position.set(3, 1, 2);
    scene.add(fillLight);

    // Rim light — gold accent from behind
    const rimLight = new THREE.DirectionalLight(0xD4AF37, 0.6);
    rimLight.position.set(0, -1, -3);
    scene.add(rimLight);

    // Ambient
    scene.add(new THREE.AmbientLight(0x303050, 0.6));

    // --- SHADOW DOT (ground indicator) ---
    const shadowGeo = new THREE.PlaneGeometry(1.2, 0.15);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.1;
    scene.add(shadow);

    // --- INTERACTION ---
    let mouseX = 0, mouseY = 0;
    let isDragging = false;
    let dragVelX = 0, dragVelY = 0;

    if (interactive) {
      const onMove = (clientX, clientY) => {
        const rect = container.getBoundingClientRect();
        const newX = ((clientX - rect.left) / rect.width - 0.5) * 2;
        const newY = ((clientY - rect.top) / rect.height - 0.5) * 2;
        if (isDragging) {
          dragVelX = (newX - mouseX) * 5;
          dragVelY = (newY - mouseY) * 5;
        }
        mouseX = newX;
        mouseY = newY;
      };

      container.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
      container.addEventListener('mousedown', () => { isDragging = true; });
      window.addEventListener('mouseup', () => { isDragging = false; });
      container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
      container.addEventListener('touchstart', () => { isDragging = true; });
      container.addEventListener('touchend', () => { isDragging = false; });
    }

    // --- ANIMATION LOOP ---
    let raf;
    let spinVelY = 0.008;
    let spinVelX = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;

      // Spin
      if (spin) {
        if (isDragging) {
          spinVelY += dragVelX * 0.01;
          spinVelX += dragVelY * 0.01;
          dragVelX *= 0.9;
          dragVelY *= 0.9;
        } else {
          // Natural spin with drag friction
          spinVelY *= 0.998;
          spinVelX *= 0.99;
          spinVelY = Math.max(spinVelY, 0.004); // minimum spin
        }
        ball.rotation.y += spinVelY;
        ball.rotation.x += spinVelX;
      }

      // Bounce / Juggle physics
      if (juggle) {
        // Realistic juggle — sharp bounce at bottom, slow at top
        const cycle = t * 1.8;
        const phase = cycle % 1;
        // Parabolic arc: y = 1 - 4*(x-0.5)^2
        const yNorm = 1 - 4 * Math.pow(phase - 0.5, 2);
        ball.position.y = yNorm * 0.4 - 0.2;

        // Spin faster on way up, slower on way down
        ball.rotation.x += (phase < 0.5 ? 0.02 : 0.008);

        // Shadow scales with height
        shadow.scale.setScalar(1 - yNorm * 0.3);
        shadow.material.opacity = 0.15 * (1 - yNorm * 0.5);
      } else if (bounce) {
        // Gentle float
        ball.position.y = Math.sin(t * 1.3) * 0.08;
        shadow.scale.setScalar(1 - Math.sin(t * 1.3) * 0.1);
      }

      // Interactive tilt
      if (interactive && !isDragging) {
        ball.rotation.x += (mouseY * 0.3 - ball.rotation.x) * 0.03;
      }

      // Ring animation
      if (ring) {
        ring.rotation.y = t * 0.3;
      }

      renderer.render(scene, camera);
    };
    animate();

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      ballGeo.dispose();
      ballMat.dispose();
      ballTexture.dispose();
      bumpMap.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [size, spin, bounce, interactive, glow, juggle]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className="relative cursor-grab active:cursor-grabbing"
    />
  );
}
