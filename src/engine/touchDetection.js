// ============================================
// STEP 3: Touch Detection Engine
// Detects ball contact with body zones
// Tuned for ML-quality ball positions from COCO-SSD
// ============================================

import { BODY_ZONES } from './poseDetection.js';
import { BALL_STATES } from './ballTracking.js';

const CONFIG = {
  proximityThreshold: 90,        // Tighter than 120 — ML gives precise positions
  proximityThresholdMotion: 120,  // Wider for motion-only fallback
  debounceDuration: 150,          // Fast touch registration
  minBallConfidence: 0.2,         // Accept low-confidence tracking
  minPoseVisibility: 0.4,         // Forgiving pose threshold
  velocityChangeThreshold: 1.5,   // Sensitive to direction changes
  mlConfidenceBonus: 0.3,         // Extra certainty when ML detected the ball
};

export class TouchDetector {
  constructor() {
    this.lastTouchTime = 0;
    this.touchCount = 0;
    this.touchLog = [];
    this.onTouch = null;
  }

  checkTouch(ballTracker, poseDetector, canvasWidth, canvasHeight) {
    const now = Date.now();

    // Check debounce
    if (now - this.lastTouchTime < CONFIG.debounceDuration) return null;

    // Ball must be tracking with at least minimal confidence
    if (ballTracker.state !== BALL_STATES.TRACKING) return null;
    if (ballTracker.confidence < CONFIG.minBallConfidence) return null;
    if (!ballTracker.position) return null;

    // Check velocity change OR upward movement near body
    const velocityChanged = this.checkVelocityChange(ballTracker);
    const movingUp = this.checkUpwardMovement(ballTracker);

    if (!velocityChanged && !movingUp) return null;

    // Use tighter threshold when ML is providing positions
    const isMLTracked = ballTracker.lastMLResult !== null;
    const threshold = isMLTracked
      ? CONFIG.proximityThreshold
      : CONFIG.proximityThresholdMotion;

    // Check proximity to body zones
    for (const [zoneName, zone] of Object.entries(BODY_ZONES)) {
      const zonePos = poseDetector.getZonePosition(zoneName, canvasWidth, canvasHeight);
      if (!zonePos) continue;
      if (zonePos.visibility < CONFIG.minPoseVisibility) continue;

      const distance = Math.hypot(
        ballTracker.position.x - zonePos.x,
        ballTracker.position.y - zonePos.y
      );

      if (distance < threshold) {
        // Touch detected!
        this.lastTouchTime = now;
        this.touchCount++;

        // ML-tracked touches get higher certainty
        const touchCertainty = isMLTracked
          ? Math.min(1, ballTracker.confidence + CONFIG.mlConfidenceBonus)
          : ballTracker.confidence;

        const touchData = {
          id: this.touchCount,
          time: now,
          zone: zoneName,
          type: zone.type,
          label: zone.label,
          position: { ...ballTracker.position },
          zonePosition: { x: zonePos.x, y: zonePos.y },
          ballConfidence: touchCertainty,
          poseVisibility: zonePos.visibility,
          isMLDetected: isMLTracked,
        };

        this.touchLog.push(touchData);

        if (this.onTouch) {
          this.onTouch(touchData);
        }

        return touchData;
      }
    }

    return null;
  }

  checkVelocityChange(ballTracker) {
    if (ballTracker.history.length < 3) return false;

    const recent = ballTracker.history.slice(-3);
    const vy1 = recent[1].y - recent[0].y;
    const vy2 = recent[2].y - recent[1].y;

    // Direction reversal (going down then up = contact bounce)
    if (vy1 > CONFIG.velocityChangeThreshold && vy2 < -CONFIG.velocityChangeThreshold) {
      return true;
    }

    // Significant deceleration
    const speed1 = Math.abs(vy1);
    const speed2 = Math.abs(vy2);
    if (speed1 > 3 && speed2 < speed1 * 0.4) {
      return true;
    }

    // Horizontal velocity change near a zone
    const vx1 = recent[1].x - recent[0].x;
    const vx2 = recent[2].x - recent[1].x;
    if (Math.abs(vx1) > 3 && Math.sign(vx1) !== Math.sign(vx2)) {
      return true;
    }

    return false;
  }

  // Detect upward ball movement (ball going up = was just kicked)
  checkUpwardMovement(ballTracker) {
    if (ballTracker.history.length < 2) return false;

    const recent = ballTracker.history.slice(-2);
    const vy = recent[1].y - recent[0].y;

    // Ball is moving upward with some speed (negative Y = up in screen coords)
    return vy < -2;
  }

  getTouchBreakdown() {
    const breakdown = { foot: 0, thigh: 0, head: 0 };
    for (const touch of this.touchLog) {
      if (breakdown[touch.type] !== undefined) {
        breakdown[touch.type]++;
      }
    }
    return breakdown;
  }

  reset() {
    this.lastTouchTime = 0;
    this.touchCount = 0;
    this.touchLog = [];
  }
}

export default TouchDetector;
