// ============================================
// STEP 2: Ball Tracking Engine — Hybrid ML + Motion
// TensorFlow.js COCO-SSD for "sports ball" detection
// + lightweight motion tracking between ML frames
// ============================================

export const BALL_STATES = {
  NOT_DETECTED: 'NOT_DETECTED',
  TRACKING: 'TRACKING',
  TOUCH: 'TOUCH',
  DROPPED: 'DROPPED',
};

const CONFIG = {
  // ML detection settings
  mlInterval: 250,            // Run COCO-SSD every 250ms
  mlMinConfidence: 0.25,      // Minimum "sports ball" confidence from COCO-SSD
  mlConfidenceBoost: 0.9,     // Confidence assigned to ML detection

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
};

// ============================================
// ML Ball Detector — COCO-SSD wrapper
// ============================================
export class MLBallDetector {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isReady = false;
    this.lastDetection = null;
    this.lastDetectTime = 0;
  }

  async initialize() {
    if (this.isLoading || this.isReady) return;
    this.isLoading = true;

    try {
      // Load TF.js runtime
      const tf = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
      );

      // Set backend to WebGL for GPU acceleration
      if (window.tf) {
        await window.tf.setBackend('webgl');
        await window.tf.ready();
      }

      // Load COCO-SSD model
      const cocoSsd = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
      );

      // The model is available on window.cocoSsd after import
      const loader = window.cocoSsd || cocoSsd;
      if (loader && loader.load) {
        this.model = await loader.load({ base: 'lite_mobilenet_v2' });
      }

      this.isReady = true;
      console.log('[MLBallDetector] COCO-SSD model loaded');
    } catch (err) {
      console.warn('[MLBallDetector] Failed to load COCO-SSD, falling back to motion-only:', err.message);
      this.isReady = false;
    } finally {
      this.isLoading = false;
    }
  }

  async detect(videoElement) {
    if (!this.model || !this.isReady) return null;

    const now = Date.now();
    if (now - this.lastDetectTime < CONFIG.mlInterval) {
      return this.lastDetection; // Return cached result
    }

    try {
      const predictions = await this.model.detect(videoElement, 10, CONFIG.mlMinConfidence);

      // Filter for "sports ball" class
      const ballPredictions = predictions.filter(
        p => p.class === 'sports ball' || p.class === 'frisbee' // frisbee as fallback for round objects
      );

      if (ballPredictions.length > 0) {
        // Pick highest confidence ball
        const best = ballPredictions.reduce((a, b) =>
          a.score > b.score ? a : b
        );

        const [bx, by, bw, bh] = best.bbox;
        this.lastDetection = {
          x: bx + bw / 2,
          y: by + bh / 2,
          width: bw,
          height: bh,
          confidence: best.score,
          class: best.class,
          source: 'ml',
        };
      } else {
        this.lastDetection = null;
      }

      this.lastDetectTime = now;
    } catch (err) {
      // Silently continue on frame errors
    }

    return this.lastDetection;
  }
}

// ============================================
// Hybrid Ball Tracker
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

    // Hidden canvas for motion processing
    this.processCanvas = null;
    this.processCtx = null;
  }

  initCanvas(width, height) {
    this.processCanvas = document.createElement('canvas');
    this.processCanvas.width = Math.floor(width / 2);
    this.processCanvas.height = Math.floor(height / 2);
    this.processCtx = this.processCanvas.getContext('2d', { willReadFrequently: true });
  }

  // Main processing — accepts optional ML result
  processFrame(videoElement, poseDetector, mlResult = null) {
    if (!this.processCanvas) {
      this.initCanvas(videoElement.videoWidth || 640, videoElement.videoHeight || 480);
    }

    const vw = videoElement.videoWidth || 640;
    const vh = videoElement.videoHeight || 480;
    const w = this.processCanvas.width;
    const h = this.processCanvas.height;

    // === PRIORITY 1: Use ML detection if available ===
    if (mlResult && mlResult.source === 'ml') {
      this.lastMLResult = mlResult;
      this.handleMLDetection(mlResult, vw, vh, poseDetector);
      // Still grab frame data for next motion detection cycle
      this.processCtx.drawImage(videoElement, 0, 0, w, h);
      this.prevFrameData = this.processCtx.getImageData(0, 0, w, h);
      return;
    }

    // === PRIORITY 2: Motion-based interpolation between ML frames ===
    const ctx = this.processCtx;
    ctx.drawImage(videoElement, 0, 0, w, h);
    const currentFrame = ctx.getImageData(0, 0, w, h);

    if (!this.prevFrameData) {
      this.prevFrameData = currentFrame;
      return;
    }

    // Get body mask points
    const bodyPoints = this.getBodyMaskPoints(poseDetector, w, h);
    // Also use segmentation mask if available
    const segMask = poseDetector ? poseDetector.segmentationMask : null;

    // Detect motion
    const motionMap = this.detectMotion(
      currentFrame.data, this.prevFrameData.data, w, h, bodyPoints, segMask
    );

    // Find candidates
    const candidates = this.findBallCandidates(motionMap, w, h);
    const filteredCandidates = this.filterCandidates(candidates, w, h);
    const bestCandidate = this.selectBestCandidate(filteredCandidates, w, h);

    // Update state with motion result (lower confidence)
    this.updateStateFromMotion(bestCandidate, poseDetector, w, h);

    this.prevFrameData = currentFrame;
  }

  // Handle high-confidence ML detection
  handleMLDetection(mlResult, videoWidth, videoHeight, poseDetector) {
    const now = Date.now();
    const fullX = mlResult.x;
    const fullY = mlResult.y;

    // Jump check
    if (this.position) {
      const jump = Math.hypot(fullX - this.position.x, fullY - this.position.y);
      if (jump > CONFIG.maxJumpDistance) {
        // Big jump but ML says ball is here — trust ML, reset tracking
        this.history = [];
      }
    }

    // Update velocity
    if (this.position) {
      this.velocity.x = fullX - this.position.x;
      this.velocity.y = fullY - this.position.y;
    }

    this.prevPosition = this.position;
    this.position = { x: fullX, y: fullY };
    this.history.push({ x: fullX, y: fullY, time: now });
    if (this.history.length > CONFIG.historyLength) this.history.shift();

    this.lastDetectedTime = now;
    this.confidence = Math.min(1, CONFIG.mlConfidenceBoost + mlResult.confidence * 0.1);
    this.frameCount++;
    this.totalConfidence += this.confidence;

    // Check drop (ball below ankles)
    if (poseDetector) {
      const ankleY = poseDetector.getAnkleLevelY(videoHeight);
      if (fullY > ankleY + 50 && this.state === BALL_STATES.TRACKING) {
        this.state = BALL_STATES.DROPPED;
        return;
      }
    }

    this.state = BALL_STATES.TRACKING;
  }

  // Motion-based fallback between ML frames
  updateStateFromMotion(candidate, poseDetector, halfW, halfH) {
    const now = Date.now();

    if (candidate) {
      const fullX = candidate.x * 2;
      const fullY = candidate.y * 2;

      // Jump check
      if (this.position) {
        const jump = Math.hypot(fullX - this.position.x, fullY - this.position.y);
        if (jump > CONFIG.maxJumpDistance) {
          this.confidence = Math.max(0, this.confidence - 0.1);
          return;
        }
      }

      if (this.position) {
        this.velocity.x = fullX - this.position.x;
        this.velocity.y = fullY - this.position.y;
      }

      this.prevPosition = this.position;
      this.position = { x: fullX, y: fullY };
      this.history.push({ x: fullX, y: fullY, time: now });
      if (this.history.length > CONFIG.historyLength) this.history.shift();

      this.lastDetectedTime = now;
      // Motion gets lower confidence than ML
      this.confidence = Math.min(1, this.confidence + 0.15);
      this.frameCount++;
      this.totalConfidence += this.confidence;

      // Drop check
      if (poseDetector) {
        const ankleY = poseDetector.getAnkleLevelY(halfH * 2);
        if (fullY > ankleY + 50 && this.state === BALL_STATES.TRACKING) {
          this.state = BALL_STATES.DROPPED;
          return;
        }
      }

      this.state = BALL_STATES.TRACKING;
    } else {
      // No detection — decay
      this.confidence = Math.max(0, this.confidence - 0.03);

      const timeSinceLast = now - this.lastDetectedTime;
      if (timeSinceLast > CONFIG.lostTimeout && this.state === BALL_STATES.TRACKING) {
        this.state = BALL_STATES.DROPPED;
      } else if (timeSinceLast > CONFIG.lostTimeout * 3) {
        this.state = BALL_STATES.NOT_DETECTED;
        this.position = null;
        this.history = [];
      }
    }
  }

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

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const i = (y * width + x) * 4;
        const gCurr = (current[i] + current[i + 1] + current[i + 2]) / 3;
        const gPrev = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
        const diff = Math.abs(gCurr - gPrev);

        if (diff > CONFIG.motionThreshold) {
          // Body masking: skip motion on body
          if (bodyPoints.length > 0 && this.isNearBody(x, y, bodyPoints)) {
            continue;
          }
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
    if (this.history.length < 2) return this.position;
    const last = this.history[this.history.length - 1];
    return { x: last.x + this.velocity.x, y: last.y + this.velocity.y };
  }

  getAverageSessionConfidence() {
    if (this.frameCount === 0) return 0;
    return this.totalConfidence / this.frameCount;
  }

  drawBallIndicator(ctx, width, height) {
    if (!this.position || this.state === BALL_STATES.NOT_DETECTED) return;
    const { x, y } = this.position;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.strokeStyle = this.state === BALL_STATES.TRACKING
      ? `rgba(0, 255, 136, ${0.4 + this.confidence * 0.5})`
      : 'rgba(255, 68, 68, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = this.state === BALL_STATES.TRACKING
      ? 'rgba(0, 255, 136, 0.9)'
      : 'rgba(255, 68, 68, 0.9)';
    ctx.fill();

    // ML badge
    if (this.lastMLResult) {
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.7)';
      ctx.fillText('ML', x + 15, y - 15);
    }

    // Confidence bar
    const barWidth = 32;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - barWidth / 2, y + 32, barWidth, 3);
    ctx.fillStyle = this.confidence > 0.6
      ? 'rgba(0, 255, 136, 0.8)'
      : 'rgba(255, 180, 0, 0.8)';
    ctx.fillRect(x - barWidth / 2, y + 32, barWidth * this.confidence, 3);

    // Trail
    if (this.history.length > 2) {
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.12)';
      ctx.lineWidth = 1;
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
  }
}

export default BallTracker;
