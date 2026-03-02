// ============================================
// STEP 2: Ball Tracking Engine — Phase 2
// Hybrid ML + Color + Motion Detection
// + Color validation for ML detections
// + Independent color-based ball finder
// + Multi-frame confirmation buffer
// + Kalman Filter with gravity model
// ============================================

export const BALL_STATES = {
  NOT_DETECTED: 'NOT_DETECTED',
  TRACKING: 'TRACKING',
  TOUCH: 'TOUCH',
  DROPPED: 'DROPPED',
};

const CONFIG = {
  // ML detection settings
  mlInterval: 150,               // ~7 Hz ML detection
  mlMinConfidence: 0.12,         // Phase 2: Lower threshold, validate with color
  mlConfidenceBoost: 0.9,

  // Phase 2: Color validation on ML detections
  colorValidateML: true,
  colorValidateMinRatio: 0.18,   // At least 18% ball-like pixels in ML bbox

  // Phase 2: Color-based independent ball finder
  colorFinderEnabled: true,
  colorFinderWidth: 80,          // Downscale to 80px width for speed

  // Phase 2: Multi-frame confirmation
  confirmRequired: 2,            // Need 2 detections in window to confirm
  confirmWindowMs: 700,          // Within 700ms
  confirmRadiusPx: 80,           // Within 80px

  // Motion fallback settings
  motionThreshold: 18,
  motionConfidenceBoost: 0.3,
  stride: 3,

  // Ball filtering
  minBallSize: 8,
  maxBallSize: 200,
  maxAspectRatio: 2.5,

  // Tracking
  historyLength: 15,
  lostTimeout: 800,
  maxJumpDistance: 300,
  bodyMaskRadius: 35,

  // Kalman filter tuning
  kalmanProcessNoise: 2.0,
  kalmanVelocityNoise: 80.0,
  kalmanMLNoise: 5.0,            // ML = highest trust
  kalmanColorNoise: 12.0,        // Color = medium-high trust
  kalmanMotionNoise: 25.0,       // Motion = lower trust
  kalmanGravity: 450,            // Pixels/s^2 downward
};

// ============================================
// Color Utility — Classify "ball-like" pixels
// Detects: white panels, neon yellow, orange,
//          neon green, pink training balls
// ============================================
function isBallLikeColor(r, g, b) {
  const luminance = r * 0.299 + g * 0.587 + b * 0.114;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max > 0 ? (max - min) / max : 0;

  // White soccer ball panels (high brightness, low saturation)
  if (luminance > 155 && sat < 0.28) return true;

  // Bright colored training balls
  if (luminance > 105 && max > 160) {
    // Orange ball (high R, medium G, low B)
    if (r > 180 && g > 100 && g < 180 && b < 90 && sat > 0.35) return true;
    // Neon yellow ball (high R, high G, low B)
    if (r > 175 && g > 175 && b < 100 && sat > 0.35) return true;
    // Neon green ball (low R, high G, low B)
    if (g > 175 && r < 150 && b < 100 && sat > 0.35) return true;
    // Pink/magenta ball
    if (r > 175 && b > 100 && g < 130 && sat > 0.3) return true;
  }

  return false;
}

// ============================================
// Kalman Filter — Smooth 2D ball tracking
// State: [x, y, vx, vy] with gravity model
// Phase 2: Accepts source type for noise tuning
// ============================================
class BallKalmanFilter {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.px = 100;
    this.py = 100;
    this.pvx = 500;
    this.pvy = 500;
    this.initialized = false;
    this.lastTime = 0;
  }

  init(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.px = 5;
    this.py = 5;
    this.pvx = 500;
    this.pvy = 500;
    this.initialized = true;
    this.lastTime = Date.now();
  }

  predict() {
    if (!this.initialized) return null;
    const now = Date.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    if (dt <= 0) return this.getState();

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += CONFIG.kalmanGravity * dt;

    this.px += this.pvx * dt * dt + CONFIG.kalmanProcessNoise;
    this.py += this.pvy * dt * dt + CONFIG.kalmanProcessNoise;
    this.pvx += CONFIG.kalmanVelocityNoise * dt;
    this.pvy += CONFIG.kalmanVelocityNoise * dt;

    return this.getState();
  }

  // Phase 2: source = 'ml' | 'color' | 'motion'
  update(measX, measY, source = 'motion') {
    if (!this.initialized) {
      this.init(measX, measY);
      return this.getState();
    }

    const r = source === 'ml' ? CONFIG.kalmanMLNoise
            : source === 'color' ? CONFIG.kalmanColorNoise
            : CONFIG.kalmanMotionNoise;

    const kx = this.px / (this.px + r);
    const ky = this.py / (this.py + r);

    const dx = measX - this.x;
    const dy = measY - this.y;

    this.x += kx * dx;
    this.y += ky * dy;

    const dt = Math.max((Date.now() - this.lastTime) / 1000, 0.016);
    const vGain = source === 'ml' ? 0.6 : source === 'color' ? 0.4 : 0.3;
    this.vx = this.vx * (1 - vGain) + (dx / Math.max(dt, 0.016)) * vGain;
    this.vy = this.vy * (1 - vGain) + (dy / Math.max(dt, 0.016)) * vGain;

    this.px *= (1 - kx);
    this.py *= (1 - ky);
    this.pvx *= (1 - vGain * 0.5);
    this.pvy *= (1 - vGain * 0.5);

    return this.getState();
  }

  getState() {
    return { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
  }

  getUncertainty() {
    return Math.sqrt(this.px * this.px + this.py * this.py);
  }

  reset() {
    this.initialized = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.px = 100; this.py = 100;
    this.pvx = 500; this.pvy = 500;
  }
}

// Helper: Load CDN script via <script> tag
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

// ============================================
// ML Ball Detector — COCO-SSD + Color Validation
// Phase 2: Lower threshold + post-validation
// ============================================
export class MLBallDetector {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isReady = false;
    this.lastDetection = null;
    this.lastDetectTime = 0;

    // Phase 2: Validation canvas for color checking
    this.valCanvas = null;
    this.valCtx = null;
  }

  async initialize() {
    if (this.isLoading || this.isReady) return;
    this.isLoading = true;

    try {
      console.log('[MLBallDetector] Loading TensorFlow.js...');
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
      );

      if (!window.tf) {
        throw new Error('window.tf not found after loading TensorFlow.js');
      }

      // Try WebGPU first (fastest), fall back to WebGL
      try {
        await window.tf.setBackend('webgpu');
        await window.tf.ready();
        console.log('[MLBallDetector] TF.js ready, backend: webgpu');
      } catch (_) {
        await window.tf.setBackend('webgl');
        await window.tf.ready();
        console.log('[MLBallDetector] TF.js ready, backend:', window.tf.getBackend());
      }

      console.log('[MLBallDetector] Loading COCO-SSD model...');
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
      );

      const loader = window.cocoSsd;
      if (!loader || !loader.load) {
        throw new Error('window.cocoSsd not found after loading COCO-SSD');
      }

      this.model = await loader.load({ base: 'lite_mobilenet_v2' });
      this.isReady = true;
      console.log('[MLBallDetector] COCO-SSD model loaded');
    } catch (err) {
      console.warn('[MLBallDetector] Failed:', err.message);
      this.isReady = false;
    } finally {
      this.isLoading = false;
    }
  }

  initValidationCanvas() {
    this.valCanvas = document.createElement('canvas');
    this.valCanvas.width = 48;
    this.valCanvas.height = 48;
    this.valCtx = this.valCanvas.getContext('2d', { willReadFrequently: true });
  }

  async detect(videoElement) {
    if (!this.model || !this.isReady) return null;

    const now = Date.now();
    if (now - this.lastDetectTime < CONFIG.mlInterval) {
      return this.lastDetection;
    }

    try {
      // Phase 2: Lower threshold, catch more candidates
      const predictions = await this.model.detect(videoElement, 10, CONFIG.mlMinConfidence);

      // Filter for ball-like objects
      const ballPredictions = predictions.filter(
        p => p.class === 'sports ball' || p.class === 'frisbee'
      );

      // Sort by confidence (highest first)
      ballPredictions.sort((a, b) => b.score - a.score);

      let validDetection = null;

      for (const pred of ballPredictions) {
        const [bx, by, bw, bh] = pred.bbox;

        // Size sanity check
        if (bw < 10 || bh < 10 || bw > 400 || bh > 400) continue;

        // Phase 2: Color validation — verify the bbox contains ball-like pixels
        if (CONFIG.colorValidateML && pred.score < 0.5) {
          const colorRatio = this.validateColor(videoElement, bx, by, bw, bh);
          if (colorRatio < CONFIG.colorValidateMinRatio) {
            continue; // Reject: not enough ball-like pixels
          }
        }

        validDetection = {
          x: bx + bw / 2,
          y: by + bh / 2,
          width: bw,
          height: bh,
          confidence: pred.score,
          class: pred.class,
          source: 'ml',
        };
        break; // Use first valid detection
      }

      this.lastDetection = validDetection;
      this.lastDetectTime = now;
    } catch (err) {
      // Silently continue on frame errors
    }

    return this.lastDetection;
  }

  // Phase 2: Validate that a detected bbox region contains ball-like colors
  validateColor(videoElement, bx, by, bw, bh) {
    if (!this.valCanvas) this.initValidationCanvas();

    try {
      const cw = this.valCanvas.width;
      const ch = this.valCanvas.height;
      this.valCtx.drawImage(videoElement, bx, by, bw, bh, 0, 0, cw, ch);
      const data = this.valCtx.getImageData(0, 0, cw, ch).data;

      let ballPixels = 0;
      let total = 0;
      const step = 3; // Sample every 3rd pixel

      for (let i = 0; i < data.length; i += 4 * step) {
        if (isBallLikeColor(data[i], data[i + 1], data[i + 2])) {
          ballPixels++;
        }
        total++;
      }

      return total > 0 ? ballPixels / total : 0;
    } catch (e) {
      return 1; // Can't validate, assume OK
    }
  }
}

// ============================================
// Hybrid Ball Tracker — Phase 2 Enhanced
// Sources: ML + Color + Motion
// Features: Kalman filter, multi-frame confirmation,
//           color-based ball finding, body exclusion
// ============================================
export class BallTracker {
  constructor() {
    this.state = BALL_STATES.NOT_DETECTED;
    this.position = null;
    this.velocity = { x: 0, y: 0 };
    this.prevPosition = null;
    this.history = [];
    this.confidence = 0;
    this.lastDetectedTime = 0;
    this.prevFrameData = null;
    this.frameCount = 0;
    this.totalConfidence = 0;
    this.lastMLResult = null;
    this.lastSource = 'none'; // 'ml' | 'color' | 'motion' | 'none'

    // Kalman filter
    this.kalman = new BallKalmanFilter();

    // Motion processing canvas (half resolution)
    this.processCanvas = null;
    this.processCtx = null;

    // Phase 2: Color finder canvas (80px width for speed)
    this.colorCanvas = null;
    this.colorCtx = null;

    // Phase 2: Multi-frame detection confirmation buffer
    this.detectionBuffer = [];
  }

  initCanvas(width, height) {
    this.processCanvas = document.createElement('canvas');
    this.processCanvas.width = Math.floor(width / 2);
    this.processCanvas.height = Math.floor(height / 2);
    this.processCtx = this.processCanvas.getContext('2d', { willReadFrequently: true });
  }

  initColorCanvas(width, height) {
    const scale = CONFIG.colorFinderWidth / width;
    this.colorCanvas = document.createElement('canvas');
    this.colorCanvas.width = CONFIG.colorFinderWidth;
    this.colorCanvas.height = Math.max(1, Math.round(height * scale));
    this.colorCtx = this.colorCanvas.getContext('2d', { willReadFrequently: true });
  }

  processFrame(videoElement, poseDetector, mlResult = null) {
    if (!this.processCanvas) {
      this.initCanvas(videoElement.videoWidth || 640, videoElement.videoHeight || 480);
    }

    const vw = videoElement.videoWidth || 640;
    const vh = videoElement.videoHeight || 480;
    const w = this.processCanvas.width;
    const h = this.processCanvas.height;

    // Track whether any source detected this frame
    let anyDetection = false;

    // === Kalman prediction every frame (smooth interpolation) ===
    if (this.kalman.initialized) {
      const predicted = this.kalman.predict();
      if (predicted) {
        this.prevPosition = this.position;
        this.position = { x: predicted.x, y: predicted.y };
        this.velocity = { x: predicted.vx, y: predicted.vy };
      }
    }

    // === SOURCE 1: ML detection (highest priority) ===
    if (mlResult && mlResult.source === 'ml') {
      this.lastMLResult = mlResult;
      this.addDetection(mlResult.x, mlResult.y, 'ml', mlResult.confidence);

      // ML with high confidence → accept immediately
      // ML with lower confidence → require confirmation
      if (mlResult.confidence > 0.45 || this.isConfirmed(mlResult.x, mlResult.y)) {
        this.applyConfirmedDetection(mlResult.x, mlResult.y, 'ml', mlResult.confidence, vw, vh, poseDetector);
        anyDetection = true;
      }
    }

    // === SOURCE 2: Color-based ball finder (independent of ML) ===
    if (CONFIG.colorFinderEnabled && !anyDetection) {
      const colorResult = this.findBallByColor(videoElement, poseDetector, vw, vh);
      if (colorResult) {
        this.addDetection(colorResult.x, colorResult.y, 'color', colorResult.confidence);

        if (this.isConfirmed(colorResult.x, colorResult.y)) {
          this.applyConfirmedDetection(colorResult.x, colorResult.y, 'color', colorResult.confidence, vw, vh, poseDetector);
          anyDetection = true;
        }
      }
    }

    // === SOURCE 3: Motion detection (fallback) ===
    const ctx = this.processCtx;
    ctx.drawImage(videoElement, 0, 0, w, h);
    const currentFrame = ctx.getImageData(0, 0, w, h);

    if (this.prevFrameData && !anyDetection) {
      const bodyPoints = this.getBodyMaskPoints(poseDetector, w, h);
      const segMask = poseDetector ? poseDetector.segmentationMask : null;

      const motionMap = this.detectMotion(
        currentFrame.data, this.prevFrameData.data, w, h, bodyPoints, segMask
      );

      const candidates = this.findBallCandidates(motionMap, w, h);
      const filteredCandidates = this.filterCandidates(candidates, w, h);
      const bestCandidate = this.selectBestCandidate(filteredCandidates, w, h);

      if (bestCandidate) {
        const fullX = bestCandidate.x * 2;
        const fullY = bestCandidate.y * 2;
        this.addDetection(fullX, fullY, 'motion', 0.3);

        if (this.isConfirmed(fullX, fullY)) {
          this.applyConfirmedDetection(fullX, fullY, 'motion', 0.3, vw, vh, poseDetector);
          anyDetection = true;
        }
      }
    }

    this.prevFrameData = currentFrame;

    // === No confirmed detection → decay ===
    if (!anyDetection) {
      this.handleNoDetection();
    }
  }

  // ========================================
  // Phase 2: Detection confirmation system
  // ========================================

  addDetection(x, y, source, confidence) {
    const now = Date.now();
    this.detectionBuffer.push({ x, y, source, confidence, time: now });

    // Prune old entries
    const cutoff = now - CONFIG.confirmWindowMs;
    this.detectionBuffer = this.detectionBuffer.filter(d => d.time > cutoff);

    // Keep buffer bounded
    if (this.detectionBuffer.length > 30) {
      this.detectionBuffer = this.detectionBuffer.slice(-20);
    }
  }

  isConfirmed(x, y) {
    const now = Date.now();
    let count = 0;
    for (const d of this.detectionBuffer) {
      if (now - d.time < CONFIG.confirmWindowMs) {
        const dist = Math.hypot(d.x - x, d.y - y);
        if (dist < CONFIG.confirmRadiusPx) {
          count++;
          if (count >= CONFIG.confirmRequired) return true;
        }
      }
    }
    return false;
  }

  // Unified handler for any confirmed detection source
  applyConfirmedDetection(x, y, source, confidence, vw, vh, poseDetector) {
    const now = Date.now();

    // Jump check
    if (this.position) {
      const jump = Math.hypot(x - this.position.x, y - this.position.y);
      if (jump > CONFIG.maxJumpDistance) {
        this.history = [];
        this.kalman.reset();
      }
    }

    // Kalman update with source-appropriate noise
    const filtered = this.kalman.update(x, y, source);

    this.prevPosition = this.position;
    this.position = { x: filtered.x, y: filtered.y };
    this.velocity = { x: filtered.vx, y: filtered.vy };

    this.history.push({ x: filtered.x, y: filtered.y, time: now });
    if (this.history.length > CONFIG.historyLength) this.history.shift();

    this.lastDetectedTime = now;
    this.lastSource = source;

    // Confidence based on source
    const confBoost = source === 'ml' ? CONFIG.mlConfidenceBoost
                    : source === 'color' ? 0.6
                    : CONFIG.motionConfidenceBoost;
    this.confidence = Math.min(1, confBoost + confidence * 0.1);
    this.frameCount++;
    this.totalConfidence += this.confidence;

    // Drop check: ball below ankles
    if (poseDetector) {
      const ankleY = poseDetector.getAnkleLevelY(vh);
      if (filtered.y > ankleY + 50 && this.state === BALL_STATES.TRACKING) {
        this.state = BALL_STATES.DROPPED;
        return;
      }
    }

    this.state = BALL_STATES.TRACKING;
  }

  handleNoDetection() {
    const now = Date.now();
    this.confidence = Math.max(0, this.confidence - 0.03);

    const timeSinceLast = now - this.lastDetectedTime;
    if (timeSinceLast > CONFIG.lostTimeout && this.state === BALL_STATES.TRACKING) {
      this.state = BALL_STATES.DROPPED;
    } else if (timeSinceLast > CONFIG.lostTimeout * 3) {
      this.state = BALL_STATES.NOT_DETECTED;
      this.position = null;
      this.history = [];
      this.kalman.reset();
      this.lastSource = 'none';
    }
  }

  // ========================================
  // Phase 2: Color-based ball finder
  // Independent detection — no ML needed
  // Finds bright circular objects not near body
  // ========================================
  findBallByColor(videoElement, poseDetector, vw, vh) {
    if (!this.colorCanvas) {
      this.initColorCanvas(vw, vh);
    }

    const cw = this.colorCanvas.width;
    const ch = this.colorCanvas.height;
    const scaleX = vw / cw;
    const scaleY = vh / ch;

    try {
      this.colorCtx.drawImage(videoElement, 0, 0, cw, ch);
      const data = this.colorCtx.getImageData(0, 0, cw, ch).data;

      // Body points at color canvas scale
      const bodyPts = [];
      if (poseDetector && poseDetector.landmarks) {
        for (const lm of poseDetector.landmarks) {
          if (lm.visibility > 0.3) {
            bodyPts.push({ x: lm.x * cw, y: lm.y * ch });
          }
        }
      }

      // Find ball-colored pixels (skip body regions)
      const ballPixels = [];
      const step = 2; // Every 2nd pixel for speed

      for (let y = 0; y < ch; y += step) {
        for (let x = 0; x < cw; x += step) {
          // Quick body exclusion
          let nearBody = false;
          for (const bp of bodyPts) {
            if (Math.abs(x - bp.x) < 6 && Math.abs(y - bp.y) < 6) {
              nearBody = true;
              break;
            }
          }
          if (nearBody) continue;

          const i = (y * cw + x) * 4;
          if (isBallLikeColor(data[i], data[i + 1], data[i + 2])) {
            ballPixels.push({ x, y });
          }
        }
      }

      if (ballPixels.length < 3 || ballPixels.length > 500) return null;

      // Cluster nearby ball pixels
      const clusters = this.clusterColorPixels(ballPixels);

      // Score and select best cluster
      return this.selectBestColorCluster(clusters, cw, ch, scaleX, scaleY);
    } catch (e) {
      return null;
    }
  }

  clusterColorPixels(pixels) {
    const clusters = [];
    const used = new Set();

    for (let i = 0; i < pixels.length; i++) {
      if (used.has(i)) continue;
      const cluster = [pixels[i]];
      used.add(i);

      for (let j = i + 1; j < pixels.length; j++) {
        if (used.has(j)) continue;
        const p = pixels[j];
        const near = cluster.some(
          c => Math.abs(c.x - p.x) <= 4 && Math.abs(c.y - p.y) <= 4
        );
        if (near) {
          cluster.push(p);
          used.add(j);
        }
      }

      // Ball-sized clusters only (not too small, not too big)
      if (cluster.length >= 3 && cluster.length <= 60) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  selectBestColorCluster(clusters, frameW, frameH, scaleX, scaleY) {
    if (clusters.length === 0) return null;

    let best = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const xs = cluster.map(p => p.x);
      const ys = cluster.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const size = Math.max(w, h);

      // Size filter
      if (size < 2 || size > 35) continue;

      // Circularity check
      const aspect = w > 0 && h > 0 ? Math.max(w / h, h / w) : 99;
      if (aspect > 2.5) continue;

      let score = 0;

      // Circularity bonus (lower aspect ratio = more circular)
      score += (2.5 - aspect) * 20;

      // Size bonus (prefer medium-sized clusters)
      score += Math.min(cluster.length, 25) * 2;

      // Proximity to last known position (strong weight)
      if (this.position) {
        const cx = (minX + maxX) / 2 * scaleX;
        const cy = (minY + maxY) / 2 * scaleY;
        const dist = Math.hypot(cx - this.position.x, cy - this.position.y);
        score += Math.max(0, 120 - dist);
      }

      // Prefer lower half of frame (ball is usually near feet/ground)
      const centerY = (minY + maxY) / 2;
      if (centerY > frameH * 0.4) score += 10;

      if (score > bestScore) {
        bestScore = score;
        best = {
          x: (minX + maxX) / 2 * scaleX,
          y: (minY + maxY) / 2 * scaleY,
          confidence: Math.min(1, score / 120),
          source: 'color',
        };
      }
    }

    return best;
  }

  // ========================================
  // Body mask + Motion detection
  // ========================================

  getBodyMaskPoints(poseDetector, width, height) {
    if (!poseDetector || !poseDetector.landmarks) return [];
    const points = [];
    for (const lm of poseDetector.landmarks) {
      if (lm.visibility > 0.3) {
        points.push({ x: lm.x * width, y: lm.y * height });
      }
    }
    return points;
  }

  isNearBody(x, y, bodyPoints) {
    const r = CONFIG.bodyMaskRadius;
    for (const bp of bodyPoints) {
      const dx = x - bp.x;
      const dy = y - bp.y;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  detectMotion(current, previous, width, height, bodyPoints, segMask) {
    const motionPixels = [];
    const stride = CONFIG.stride;

    // Phase 2: If segmentation mask available, use it for precise body exclusion
    let segData = null;
    if (segMask) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(segMask, 0, 0, width, height);
        segData = tempCtx.getImageData(0, 0, width, height).data;
      } catch (e) {
        segData = null;
      }
    }

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const i = (y * width + x) * 4;

        // Body exclusion: seg mask (precise) or landmark radius (fallback)
        if (segData) {
          if (segData[i] > 128) continue; // Body pixel
        } else if (bodyPoints.length > 0 && this.isNearBody(x, y, bodyPoints)) {
          continue;
        }

        const gCurr = (current[i] + current[i + 1] + current[i + 2]) / 3;
        const gPrev = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
        const diff = Math.abs(gCurr - gPrev);

        if (diff > CONFIG.motionThreshold) {
          motionPixels.push({ x, y, intensity: diff });
        }
      }
    }
    return motionPixels;
  }

  findBallCandidates(motionPixels, width, height) {
    if (motionPixels.length < 2) return [];

    const clusters = [];
    const used = new Set();

    for (let i = 0; i < motionPixels.length; i++) {
      if (used.has(i)) continue;
      const cluster = [motionPixels[i]];
      used.add(i);

      for (let j = i + 1; j < motionPixels.length; j++) {
        if (used.has(j)) continue;
        const p = motionPixels[j];
        const nearest = cluster.some(
          c => Math.abs(c.x - p.x) < 35 && Math.abs(c.y - p.y) < 35
        );
        if (nearest) { cluster.push(p); used.add(j); }
      }

      if (cluster.length >= 2) clusters.push(cluster);
    }

    return clusters.map(cluster => {
      const xs = cluster.map(p => p.x);
      const ys = cluster.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const w = maxX - minX, h = maxY - minY;
      const aspect = w > 0 && h > 0 ? Math.max(w / h, h / w) : 99;

      return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width: w, height: h,
        size: Math.max(w, h),
        aspect,
        pixelCount: cluster.length,
        avgIntensity: cluster.reduce((s, p) => s + p.intensity, 0) / cluster.length,
      };
    });
  }

  filterCandidates(candidates, canvasWidth, canvasHeight) {
    return candidates.filter(c => {
      if (c.size < CONFIG.minBallSize || c.size > CONFIG.maxBallSize) return false;
      if (c.aspect > CONFIG.maxAspectRatio) return false;
      return true;
    });
  }

  selectBestCandidate(candidates, width, height) {
    if (candidates.length === 0) return null;

    return candidates.reduce((best, c) => {
      let score = 0;
      score += (2.5 - c.aspect) * 20;

      if (this.position) {
        const predicted = this.predictPosition();
        if (predicted) {
          const dist = Math.hypot(c.x - predicted.x, c.y - predicted.y);
          score += Math.max(0, 80 - dist);
        }
      }

      score += c.avgIntensity * 0.5;
      score += c.pixelCount * 2;

      c.score = score;
      return !best || score > best.score ? c : best;
    }, null);
  }

  predictPosition() {
    if (this.kalman.initialized) {
      const state = this.kalman.getState();
      return { x: state.x + state.vx * 0.016, y: state.y + state.vy * 0.016 };
    }
    if (this.history.length < 2) return this.position;
    const last = this.history[this.history.length - 1];
    return { x: last.x + this.velocity.x, y: last.y + this.velocity.y };
  }

  getAverageSessionConfidence() {
    if (this.frameCount === 0) return 0;
    return this.totalConfidence / this.frameCount;
  }

  // ============================================
  // AR Ball Indicator — Phase 2: Shows source
  // ============================================
  drawBallIndicator(ctx, width, height) {
    if (!this.position || this.state === BALL_STATES.NOT_DETECTED) return;

    const { x, y } = this.position;
    const tracking = this.state === BALL_STATES.TRACKING;
    const source = this.lastSource;

    // Source-based colors
    const sourceColors = {
      ml: [0, 255, 136],       // Green for ML
      color: [100, 200, 255],  // Light blue for color
      motion: [255, 180, 0],   // Orange for motion
      none: [255, 68, 68],     // Red for lost
    };
    const color = tracking ? (sourceColors[source] || sourceColors.ml) : [255, 68, 68];
    const colorStr = color.join(',');

    // Animated pulse
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    const outerR = 28 + pulse * 6;

    // --- Background glow ---
    ctx.beginPath();
    ctx.arc(x, y, outerR + 12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colorStr}, 0.06)`;
    ctx.fill();

    // --- Outer animated ring ---
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${colorStr}, ${0.3 + this.confidence * 0.5})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // --- Inner ring ---
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${colorStr}, 0.7)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Crosshair ---
    const ch = 8;
    ctx.beginPath();
    ctx.moveTo(x - ch, y);
    ctx.lineTo(x + ch, y);
    ctx.moveTo(x, y - ch);
    ctx.lineTo(x, y + ch);
    ctx.strokeStyle = `rgba(${colorStr}, 0.9)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Center dot ---
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colorStr}, 1)`;
    ctx.fill();

    // --- ML Bounding box corners ---
    if (this.lastMLResult && this.lastMLResult.width && source === 'ml') {
      const hw = this.lastMLResult.width / 2;
      const hh = this.lastMLResult.height / 2;
      const cornerLen = 10;

      ctx.strokeStyle = `rgba(${colorStr}, 0.6)`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'square';

      // Top-left
      ctx.beginPath();
      ctx.moveTo(x - hw, y - hh + cornerLen);
      ctx.lineTo(x - hw, y - hh);
      ctx.lineTo(x - hw + cornerLen, y - hh);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(x + hw - cornerLen, y - hh);
      ctx.lineTo(x + hw, y - hh);
      ctx.lineTo(x + hw, y - hh + cornerLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x - hw, y + hh - cornerLen);
      ctx.lineTo(x - hw, y + hh);
      ctx.lineTo(x - hw + cornerLen, y + hh);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x + hw - cornerLen, y + hh);
      ctx.lineTo(x + hw, y + hh);
      ctx.lineTo(x + hw, y + hh - cornerLen);
      ctx.stroke();

      ctx.lineCap = 'round';
    }

    // --- Label badge (shows detection source) ---
    const labelMap = { ml: 'ML BALL', color: 'COLOR', motion: 'MOTION' };
    const label = labelMap[source] || 'TRACKING';
    ctx.font = 'bold 10px monospace';
    const labelWidth = ctx.measureText(label).width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - labelWidth / 2 - 6, y - outerR - 22, labelWidth + 12, 16);

    ctx.fillStyle = `rgba(${colorStr}, 0.95)`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - outerR - 10);
    ctx.textAlign = 'start';

    // --- Confidence bar ---
    const barW = 40;
    const barH = 4;
    const barX = x - barW / 2;
    const barY = y + outerR + 8;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = this.confidence > 0.6
      ? `rgba(${colorStr}, 0.85)`
      : 'rgba(255, 180, 0, 0.85)';
    ctx.fillRect(barX, barY, barW * this.confidence, barH);

    // --- Trail line ---
    if (this.history.length > 2) {
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.strokeStyle = `rgba(${colorStr}, 0.18)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  reset() {
    this.state = BALL_STATES.NOT_DETECTED;
    this.position = null;
    this.prevPosition = null;
    this.velocity = { x: 0, y: 0 };
    this.history = [];
    this.confidence = 0;
    this.lastDetectedTime = 0;
    this.prevFrameData = null;
    this.frameCount = 0;
    this.totalConfidence = 0;
    this.lastMLResult = null;
    this.lastSource = 'none';
    this.kalman.reset();
    this.detectionBuffer = [];
  }
}

export default BallTracker;
