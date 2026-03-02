// ============================================
// STEP 1: Pose Detection Engine
// MediaPipe Pose setup + landmark processing
// Fixed: CDN loaded via <script> tag (not import())
// Enhanced: Neon AR skeleton overlay
// ============================================

// Helper: Load CDN script via <script> tag — reliable on all mobile browsers
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Already loaded?
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

const POSE_CONFIG = {
  modelComplexity: 1,       // 0=lite, 1=full, 2=heavy
  smoothLandmarks: true,
  enableSegmentation: true,  // Phase 2: Enable for body mask exclusion in ball tracking
  smoothSegmentation: true,  // Smooth mask across frames
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

// Body zone landmark indices (MediaPipe 33 landmarks)
export const BODY_ZONES = {
  RIGHT_FOOT: { landmarks: [28, 30, 32], label: 'Right Foot', type: 'foot' },
  LEFT_FOOT: { landmarks: [27, 29, 31], label: 'Left Foot', type: 'foot' },
  RIGHT_THIGH: { landmarks: [24, 26], label: 'Right Thigh', type: 'thigh' },
  LEFT_THIGH: { landmarks: [23, 25], label: 'Left Thigh', type: 'thigh' },
  HEAD: { landmarks: [0, 7, 8], label: 'Head', type: 'head' },
};

// Skeleton connection pairs for overlay drawing
export const SKELETON_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso
  [23, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
  [27, 29], [29, 31], // left foot
  [28, 30], [30, 32], // right foot
];

export class PoseDetector {
  constructor() {
    this.pose = null;
    this.camera = null;
    this.landmarks = null;
    this.poseConfidence = 0;
    this.isInitialized = false;
    this.onResults = null;
    this.frameCount = 0;
    this.totalConfidence = 0;
    this.segmentationMask = null;
    this._sending = false; // Guard against overlapping send() calls
  }

  async initialize(videoElement, onResultsCallback) {
    this.onResults = onResultsCallback;

    try {
      console.log('[PoseDetector] Loading MediaPipe Pose from CDN...');

      // Load MediaPipe Pose via <script> tag (UMD — sets window.Pose)
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js'
      );

      // Access Pose class from global scope
      const PoseClass = window.Pose;
      if (!PoseClass) {
        throw new Error('window.Pose not found after script load');
      }

      console.log('[PoseDetector] Creating Pose instance...');

      this.pose = new PoseClass({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
      });

      this.pose.setOptions(POSE_CONFIG);

      this.pose.onResults((results) => {
        this.processResults(results);
      });

      this.isInitialized = true;
      console.log('[PoseDetector] ✅ MediaPipe Pose ready');
    } catch (err) {
      console.error('[PoseDetector] ❌ Init failed:', err);
      this.isInitialized = false;
    }

    return this.pose;
  }

  processResults(results) {
    if (results.poseLandmarks) {
      this.landmarks = results.poseLandmarks;
      this.poseConfidence = this.calculateAverageConfidence(results.poseLandmarks);
      this.frameCount++;
      this.totalConfidence += this.poseConfidence;
    } else {
      this.landmarks = null;
      this.poseConfidence = 0;
    }

    // Store segmentation mask if available
    this.segmentationMask = results.segmentationMask || null;

    if (this.onResults) {
      this.onResults({
        landmarks: this.landmarks,
        confidence: this.poseConfidence,
        segmentationMask: this.segmentationMask,
      });
    }
  }

  calculateAverageConfidence(landmarks) {
    if (!landmarks || landmarks.length === 0) return 0;
    const sum = landmarks.reduce((acc, lm) => acc + (lm.visibility || 0), 0);
    return sum / landmarks.length;
  }

  getAverageSessionConfidence() {
    if (this.frameCount === 0) return 0;
    return this.totalConfidence / this.frameCount;
  }

  getZonePosition(zoneName, canvasWidth, canvasHeight) {
    if (!this.landmarks) return null;
    const zone = BODY_ZONES[zoneName];
    if (!zone) return null;

    let sumX = 0, sumY = 0, count = 0, minVis = 1;
    for (const idx of zone.landmarks) {
      const lm = this.landmarks[idx];
      if (lm && lm.visibility > 0.3) {
        sumX += lm.x * canvasWidth;
        sumY += lm.y * canvasHeight;
        minVis = Math.min(minVis, lm.visibility);
        count++;
      }
    }

    if (count === 0) return null;
    return {
      x: sumX / count,
      y: sumY / count,
      visibility: minVis,
      type: zone.type,
      label: zone.label,
    };
  }

  getAnkleLevelY(canvasHeight) {
    if (!this.landmarks) return canvasHeight;
    const leftAnkle = this.landmarks[27];
    const rightAnkle = this.landmarks[28];
    const ankles = [leftAnkle, rightAnkle].filter(a => a && a.visibility > 0.3);
    if (ankles.length === 0) return canvasHeight;
    return Math.max(...ankles.map(a => a.y * canvasHeight));
  }

  getBodyWidth(canvasWidth) {
    if (!this.landmarks) return canvasWidth * 0.5;
    const leftShoulder = this.landmarks[11];
    const rightShoulder = this.landmarks[12];
    if (!leftShoulder || !rightShoulder) return canvasWidth * 0.5;
    return Math.abs(leftShoulder.x - rightShoulder.x) * canvasWidth * 2;
  }

  getBodyFillPercent(canvasHeight) {
    if (!this.landmarks) return 0;
    const ys = this.landmarks
      .filter(lm => lm.visibility > 0.3)
      .map(lm => lm.y);
    if (ys.length === 0) return 0;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return ((maxY - minY) * 100);
  }

  // Guard: only one send() at a time (prevents queue buildup on slow devices)
  async sendFrame(videoElement) {
    if (this.pose && this.isInitialized && !this._sending) {
      this._sending = true;
      try {
        await this.pose.send({ image: videoElement });
      } catch (err) {
        // Frame processing error — continue silently
      } finally {
        this._sending = false;
      }
    }
  }

  resetSession() {
    this.frameCount = 0;
    this.totalConfidence = 0;
  }

  // ============================================
  // AR Skeleton Overlay — Neon wireframe
  // ============================================
  drawSkeleton(ctx, width, height) {
    if (!this.landmarks) return;

    ctx.clearRect(0, 0, width, height);

    // --- Draw skeleton connections with neon glow ---
    for (const [i, j] of SKELETON_CONNECTIONS) {
      const a = this.landmarks[i];
      const b = this.landmarks[j];
      if (a && b && a.visibility > 0.3 && b.visibility > 0.3) {
        const ax = a.x * width, ay = a.y * height;
        const bx = b.x * width, by = b.y * height;

        // Outer glow layer
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(0, 220, 255, 0.12)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Mid glow layer
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(0, 220, 255, 0.3)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Core line
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = 'rgba(0, 235, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // --- Draw landmark points ---
    for (let i = 0; i < this.landmarks.length; i++) {
      const lm = this.landmarks[i];
      if (lm.visibility > 0.3) {
        const x = lm.x * width;
        const y = lm.y * height;

        // Check if this landmark is a touch zone
        let isZone = false;
        let zoneType = null;
        for (const zone of Object.values(BODY_ZONES)) {
          if (zone.landmarks.includes(i)) {
            isZone = true;
            zoneType = zone.type;
            break;
          }
        }

        if (isZone) {
          // Zone landmark — large, colored by type
          const colors = {
            foot: { r: 212, g: 175, b: 55 },    // Gold
            thigh: { r: 100, g: 255, b: 160 },   // Green
            head: { r: 255, g: 120, b: 120 },     // Red/pink
          };
          const c = colors[zoneType] || colors.foot;

          // Glow ring
          ctx.beginPath();
          ctx.arc(x, y, 16, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.12)`;
          ctx.fill();

          // Outer ring
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.6)`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Inner dot
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`;
          ctx.fill();
        } else {
          // Regular landmark — small cyan dot
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 220, 255, 0.6)';
          ctx.fill();
        }
      }
    }

    // --- Draw zone proximity circles (detection areas) ---
    for (const [name, zone] of Object.entries(BODY_ZONES)) {
      const pos = this.getZonePosition(name, width, height);
      if (!pos) continue;

      // Dashed detection radius circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 50, 0, Math.PI * 2);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Zone label
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText(zone.type.toUpperCase(), pos.x, pos.y - 18);
      ctx.textAlign = 'start';
    }
  }
}

export default PoseDetector;
