// ============================================
// STEP 2: Ball Tracking Engine
// Motion detection + body-masked ball tracking
// ============================================

export const BALL_STATES = {
  NOT_DETECTED: 'NOT_DETECTED',
  TRACKING: 'TRACKING',
  TOUCH: 'TOUCH',
  DROPPED: 'DROPPED',
};

const CONFIG = {
  motionThreshold: 18,        // lowered from 25 — more sensitive
  minBallSize: 10,            // lowered from 15 — catch smaller ball
  maxBallSize: 150,           // raised from 100 — ball can look big on phone
  maxAspectRatio: 2.5,        // slightly more forgiving shape
  historyLength: 12,          // more history for trajectory
  lostTimeout: 700,           // raised from 500 — more patient
  dropTimeout: 400,           // raised from 300
  maxJumpDistance: 250,        // raised from 200 — faster movement ok
  proximityThreshold: 70,
  bodyMaskRadius: 35,          // NEW: exclude motion within 35px of body landmarks
  stride: 3,                   // NEW: pixel skip (was hardcoded 4)
};

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

    // Hidden canvas for frame processing
    this.processCanvas = null;
    this.processCtx = null;
  }

  initCanvas(width, height) {
    this.processCanvas = document.createElement('canvas');
    this.processCanvas.width = Math.floor(width / 2);
    this.processCanvas.height = Math.floor(height / 2);
    this.processCtx = this.processCanvas.getContext('2d', { willReadFrequently: true });
  }

  processFrame(videoElement, poseDetector) {
    if (!this.processCanvas) {
      this.initCanvas(videoElement.videoWidth || 640, videoElement.videoHeight || 480);
    }

    const w = this.processCanvas.width;
    const h = this.processCanvas.height;
    const ctx = this.processCtx;

    // Draw current frame (half resolution)
    ctx.drawImage(videoElement, 0, 0, w, h);
    const currentFrame = ctx.getImageData(0, 0, w, h);

    if (!this.prevFrameData) {
      this.prevFrameData = currentFrame;
      return;
    }

    // Get body landmark positions for masking (at half-res)
    const bodyPoints = this.getBodyMaskPoints(poseDetector, w, h);

    // Motion detection: frame difference with body masking
    const motionMap = this.detectMotion(currentFrame.data, this.prevFrameData.data, w, h, bodyPoints);

    // Find ball candidates from motion clusters
    const candidates = this.findBallCandidates(motionMap, w, h);

    // Filter candidates
    const bodyWidth = poseDetector ? poseDetector.getBodyWidth(w) : w * 0.5;
    const filteredCandidates = this.filterCandidates(candidates, bodyWidth, w, h);

    // Pick best candidate using trajectory prediction
    const bestCandidate = this.selectBestCandidate(filteredCandidates, w, h);

    // Update state
    this.updateState(bestCandidate, poseDetector, w, h);

    // Store for next frame
    this.prevFrameData = currentFrame;
  }

  // NEW: Get body landmark positions at half-res for masking
  getBodyMaskPoints(poseDetector, width, height) {
    if (!poseDetector || !poseDetector.landmarks) return [];

    const points = [];
    for (const lm of poseDetector.landmarks) {
      if (lm.visibility > 0.3) {
        points.push({
          x: lm.x * width,
          y: lm.y * height,
        });
      }
    }
    return points;
  }

  // NEW: Check if a pixel is near any body landmark
  isNearBody(x, y, bodyPoints) {
    const r = CONFIG.bodyMaskRadius;
    for (const bp of bodyPoints) {
      const dx = x - bp.x;
      const dy = y - bp.y;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  detectMotion(current, previous, width, height, bodyPoints) {
    const motionPixels = [];
    const stride = CONFIG.stride;

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const i = (y * width + x) * 4;
        // Grayscale difference
        const gCurr = (current[i] + current[i + 1] + current[i + 2]) / 3;
        const gPrev = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
        const diff = Math.abs(gCurr - gPrev);

        if (diff > CONFIG.motionThreshold) {
          // BODY MASKING: skip motion that's ON the body
          if (bodyPoints.length > 0 && this.isNearBody(x, y, bodyPoints)) {
            continue; // This motion is from body movement, not the ball
          }
          motionPixels.push({ x, y, intensity: diff });
        }
      }
    }

    return motionPixels;
  }

  findBallCandidates(motionPixels, width, height) {
    if (motionPixels.length < 3) return []; // lowered from 5

    // Simple clustering: group nearby motion pixels
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
          c => Math.abs(c.x - p.x) < 35 && Math.abs(c.y - p.y) < 35 // widened from 30
        );
        if (nearest) {
          cluster.push(p);
          used.add(j);
        }
      }

      if (cluster.length >= 2) { // lowered from 3
        clusters.push(cluster);
      }
    }

    // Convert clusters to bounding boxes with metrics
    return clusters.map(cluster => {
      const xs = cluster.map(p => p.x);
      const ys = cluster.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const w = maxX - minX;
      const h = maxY - minY;
      const aspect = w > 0 && h > 0 ? Math.max(w / h, h / w) : 99;
      const size = Math.max(w, h);

      return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width: w,
        height: h,
        size,
        aspect,
        pixelCount: cluster.length,
        avgIntensity: cluster.reduce((s, p) => s + p.intensity, 0) / cluster.length,
      };
    });
  }

  filterCandidates(candidates, bodyWidth, canvasWidth, canvasHeight) {
    return candidates.filter(c => {
      if (c.size < CONFIG.minBallSize || c.size > CONFIG.maxBallSize) return false;
      if (c.aspect > CONFIG.maxAspectRatio) return false;
      if (c.x < 0 || c.x > canvasWidth || c.y < 0 || c.y > canvasHeight) return false;
      return true;
    });
  }

  selectBestCandidate(candidates, width, height) {
    if (candidates.length === 0) return null;

    return candidates.reduce((best, c) => {
      let score = 0;

      // Circularity bonus (lower aspect = more circular)
      score += (2.5 - c.aspect) * 20;

      // Trajectory prediction bonus (stronger weight)
      if (this.position) {
        const predicted = this.predictPosition();
        if (predicted) {
          const dist = Math.hypot(c.x - predicted.x, c.y - predicted.y);
          score += Math.max(0, 80 - dist); // raised from 50
        }
      }

      // Motion intensity
      score += c.avgIntensity * 0.5;

      // Size sweet spot (prefer 20-80 pixel diameter)
      const idealSize = 45;
      score -= Math.abs(c.size - idealSize) * 0.2; // less penalty

      // Pixel density — more pixels = more likely a real object
      score += c.pixelCount * 2;

      c.score = score;
      return !best || score > best.score ? c : best;
    }, null);
  }

  predictPosition() {
    if (this.history.length < 2) return this.position;
    const last = this.history[this.history.length - 1];
    return {
      x: last.x + this.velocity.x,
      y: last.y + this.velocity.y,
    };
  }

  updateState(candidate, poseDetector, width, height) {
    const now = Date.now();

    if (candidate) {
      // Scale back to full resolution
      const fullX = candidate.x * 2;
      const fullY = candidate.y * 2;

      // Check for teleporting (max jump distance)
      if (this.position) {
        const jump = Math.hypot(fullX - this.position.x, fullY - this.position.y);
        if (jump > CONFIG.maxJumpDistance) {
          this.confidence = Math.max(0, this.confidence - 0.1); // less harsh penalty
          return;
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
      if (this.history.length > CONFIG.historyLength) {
        this.history.shift();
      }

      this.lastDetectedTime = now;
      this.confidence = Math.min(1, this.confidence + 0.25); // faster lock-on (was 0.15)
      this.frameCount++;
      this.totalConfidence += this.confidence;

      // Check if ball is below ankles (dropped)
      if (poseDetector) {
        const ankleY = poseDetector.getAnkleLevelY(height * 2);
        if (fullY > ankleY + 50 && this.state === BALL_STATES.TRACKING) { // more buffer (was 30)
          this.state = BALL_STATES.DROPPED;
          return;
        }
      }

      this.state = BALL_STATES.TRACKING;
    } else {
      // No candidate found
      this.confidence = Math.max(0, this.confidence - 0.03); // slower decay (was 0.05)

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

  getAverageSessionConfidence() {
    if (this.frameCount === 0) return 0;
    return this.totalConfidence / this.frameCount;
  }

  drawBallIndicator(ctx, width, height) {
    if (!this.position || this.state === BALL_STATES.NOT_DETECTED) return;

    const { x, y } = this.position;

    // Outer tracking circle
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.strokeStyle = this.state === BALL_STATES.TRACKING
      ? `rgba(0, 212, 255, ${0.4 + this.confidence * 0.4})`
      : 'rgba(255, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = this.state === BALL_STATES.TRACKING
      ? 'rgba(0, 212, 255, 0.8)'
      : 'rgba(255, 68, 68, 0.8)';
    ctx.fill();

    // Velocity trail
    if (this.history.length > 2) {
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Confidence bar (small bar under ball indicator)
    const barWidth = 30;
    const barX = x - barWidth / 2;
    const barY = y + 30;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(barX, barY, barWidth, 3);
    ctx.fillStyle = this.confidence > 0.5 ? 'rgba(0, 212, 255, 0.8)' : 'rgba(255, 180, 0, 0.8)';
    ctx.fillRect(barX, barY, barWidth * this.confidence, 3);
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
  }
}

export default BallTracker;
