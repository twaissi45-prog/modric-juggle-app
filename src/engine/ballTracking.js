// ============================================
// STEP 2: Ball Tracking Engine
// Motion detection + heuristic ball tracking
// ============================================

export const BALL_STATES = {
  NOT_DETECTED: 'NOT_DETECTED',
  TRACKING: 'TRACKING',
  TOUCH: 'TOUCH',
  DROPPED: 'DROPPED',
};

const CONFIG = {
  motionThreshold: 25,
  minBallSize: 15,
  maxBallSize: 100,
  maxAspectRatio: 2.0,
  historyLength: 10,
  lostTimeout: 500,
  dropTimeout: 300,
  maxJumpDistance: 200,
  proximityThreshold: 70,
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
    this.processCanvas.width = Math.floor(width / 2); // Half res for performance
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

    // Motion detection: frame difference
    const motionMap = this.detectMotion(currentFrame.data, this.prevFrameData.data, w, h);

    // Find ball candidates from motion clusters
    const candidates = this.findBallCandidates(motionMap, w, h);

    // Filter with pose data (ball should be near body)
    const bodyWidth = poseDetector ? poseDetector.getBodyWidth(w) : w * 0.5;
    const filteredCandidates = this.filterCandidates(candidates, bodyWidth, w, h);

    // Pick best candidate using trajectory prediction
    const bestCandidate = this.selectBestCandidate(filteredCandidates, w, h);

    // Update state
    this.updateState(bestCandidate, poseDetector, w, h);

    // Store for next frame
    this.prevFrameData = currentFrame;
  }

  detectMotion(current, previous, width, height) {
    const motionPixels = [];
    const stride = 4; // Skip pixels for performance

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const i = (y * width + x) * 4;
        // Grayscale difference
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
    if (motionPixels.length < 5) return [];

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
        // Check proximity to any point in cluster
        const nearest = cluster.some(
          c => Math.abs(c.x - p.x) < 30 && Math.abs(c.y - p.y) < 30
        );
        if (nearest) {
          cluster.push(p);
          used.add(j);
        }
      }

      if (cluster.length >= 3) {
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
      // Size filter
      if (c.size < CONFIG.minBallSize || c.size > CONFIG.maxBallSize) return false;
      // Aspect ratio (roughly circular)
      if (c.aspect > CONFIG.maxAspectRatio) return false;
      // Must be in frame
      if (c.x < 0 || c.x > canvasWidth || c.y < 0 || c.y > canvasHeight) return false;
      return true;
    });
  }

  selectBestCandidate(candidates, width, height) {
    if (candidates.length === 0) return null;

    // Score each candidate
    return candidates.reduce((best, c) => {
      let score = 0;

      // Circularity bonus (lower aspect = more circular)
      score += (2.0 - c.aspect) * 20;

      // Trajectory prediction bonus
      if (this.position) {
        const predicted = this.predictPosition();
        if (predicted) {
          const dist = Math.hypot(c.x - predicted.x, c.y - predicted.y);
          score += Math.max(0, 50 - dist);
        }
      }

      // Motion intensity
      score += c.avgIntensity * 0.5;

      // Size sweet spot (prefer 30-60 pixel diameter)
      const idealSize = 40;
      score -= Math.abs(c.size - idealSize) * 0.3;

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
          // Too big a jump — might be noise
          this.confidence = Math.max(0, this.confidence - 0.2);
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
      this.confidence = Math.min(1, this.confidence + 0.15);
      this.frameCount++;
      this.totalConfidence += this.confidence;

      // Check if ball is below ankles (dropped)
      if (poseDetector) {
        const ankleY = poseDetector.getAnkleLevelY(height * 2);
        if (fullY > ankleY + 30 && this.state === BALL_STATES.TRACKING) {
          this.state = BALL_STATES.DROPPED;
          return;
        }
      }

      this.state = BALL_STATES.TRACKING;
    } else {
      // No candidate found
      this.confidence = Math.max(0, this.confidence - 0.05);

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
