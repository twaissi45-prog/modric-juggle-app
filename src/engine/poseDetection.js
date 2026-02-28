// ============================================
// STEP 1: Pose Detection Engine
// MediaPipe Pose setup + landmark processing
// ============================================

const POSE_CONFIG = {
  modelComplexity: 1,
  smoothLandmarks: true,
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
  }

  async initialize(videoElement, onResultsCallback) {
    this.onResults = onResultsCallback;

    // Load MediaPipe Pose from CDN
    const { Pose } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js'
    );

    this.pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
    });

    this.pose.setOptions(POSE_CONFIG);

    this.pose.onResults((results) => {
      this.processResults(results);
    });

    this.isInitialized = true;
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

    if (this.onResults) {
      this.onResults({
        landmarks: this.landmarks,
        confidence: this.poseConfidence,
        segmentationMask: results.segmentationMask,
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

  async sendFrame(videoElement) {
    if (this.pose && this.isInitialized) {
      await this.pose.send({ image: videoElement });
    }
  }

  resetSession() {
    this.frameCount = 0;
    this.totalConfidence = 0;
  }

  drawSkeleton(ctx, width, height) {
    if (!this.landmarks) return;

    ctx.clearRect(0, 0, width, height);

    // Draw connections
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (const [i, j] of SKELETON_CONNECTIONS) {
      const a = this.landmarks[i];
      const b = this.landmarks[j];
      if (a && b && a.visibility > 0.3 && b.visibility > 0.3) {
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
      }
    }

    // Draw landmarks
    for (let i = 0; i < this.landmarks.length; i++) {
      const lm = this.landmarks[i];
      if (lm.visibility > 0.3) {
        const x = lm.x * width;
        const y = lm.y * height;

        // Check if this landmark is in a touch zone
        let isZone = false;
        for (const zone of Object.values(BODY_ZONES)) {
          if (zone.landmarks.includes(i)) { isZone = true; break; }
        }

        ctx.beginPath();
        ctx.arc(x, y, isZone ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isZone
          ? 'rgba(212, 175, 55, 0.8)'
          : 'rgba(0, 212, 255, 0.6)';
        ctx.fill();
      }
    }
  }
}

export default PoseDetector;
