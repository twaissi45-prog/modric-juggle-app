// ============================================
// STEP 3: Touch Detection Engine
// Detects ball contact with body zones
// ============================================

import { BODY_ZONES } from './poseDetection.js';
import { BALL_STATES } from './ballTracking.js';

const CONFIG = {
  proximityThreshold: 70,
  debounceDuration: 200,
  minBallConfidence: 0.4,
  minPoseVisibility: 0.5,
  velocityChangeThreshold: 3,
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

    // Ball must be tracking with sufficient confidence
    if (ballTracker.state !== BALL_STATES.TRACKING) return null;
    if (ballTracker.confidence < CONFIG.minBallConfidence) return null;
    if (!ballTracker.position) return null;

    // Check velocity change (ball direction reversal or deceleration)
    const velocityChanged = this.checkVelocityChange(ballTracker);
    if (!velocityChanged) return null;

    // Check proximity to body zones
    for (const [zoneName, zone] of Object.entries(BODY_ZONES)) {
      const zonePos = poseDetector.getZonePosition(zoneName, canvasWidth, canvasHeight);
      if (!zonePos) continue;
      if (zonePos.visibility < CONFIG.minPoseVisibility) continue;

      const distance = Math.hypot(
        ballTracker.position.x - zonePos.x,
        ballTracker.position.y - zonePos.y
      );

      if (distance < CONFIG.proximityThreshold) {
        // Touch detected!
        this.lastTouchTime = now;
        this.touchCount++;

        const touchData = {
          id: this.touchCount,
          time: now,
          zone: zoneName,
          type: zone.type,
          label: zone.label,
          position: { ...ballTracker.position },
          zonePosition: { x: zonePos.x, y: zonePos.y },
          ballConfidence: ballTracker.confidence,
          poseVisibility: zonePos.visibility,
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
    const vy1 = recent[1].y - recent[0].y; // Previous vertical velocity
    const vy2 = recent[2].y - recent[1].y; // Current vertical velocity

    // Direction reversal (going down then up = contact bounce)
    if (vy1 > CONFIG.velocityChangeThreshold && vy2 < -CONFIG.velocityChangeThreshold) {
      return true;
    }

    // Significant deceleration
    const speed1 = Math.abs(vy1);
    const speed2 = Math.abs(vy2);
    if (speed1 > 5 && speed2 < speed1 * 0.3) {
      return true;
    }

    // Horizontal velocity change near a zone
    const vx1 = recent[1].x - recent[0].x;
    const vx2 = recent[2].x - recent[1].x;
    if (Math.abs(vx1) > 5 && Math.sign(vx1) !== Math.sign(vx2)) {
      return true;
    }

    return false;
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
