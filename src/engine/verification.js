// ============================================
// STEP 8 of Engine: Verification System
// Session verification checks
// ============================================

const CHECKS = {
  poseConfidence: { label: 'Pose Confidence', threshold: 0.65, weight: 0.25 },
  ballConfidence: { label: 'Ball Tracking', threshold: 0.50, weight: 0.25 },
  bodyVisibility: { label: 'Body Visibility', threshold: 0.80, weight: 0.20 },
  motionConsistency: { label: 'Motion Consistency', threshold: 0.80, weight: 0.15 },
  velocitySanity: { label: 'Velocity Sanity', threshold: 0.80, weight: 0.15 },
};

export class VerificationEngine {
  static verify(sessionData) {
    const checks = [];
    let weightedTotal = 0;

    // 1. Average Pose Confidence
    const poseScore = Math.min(1, sessionData.avgPoseConfidence / CHECKS.poseConfidence.threshold);
    checks.push({
      ...CHECKS.poseConfidence,
      value: sessionData.avgPoseConfidence,
      score: poseScore,
      passed: sessionData.avgPoseConfidence >= CHECKS.poseConfidence.threshold,
    });
    weightedTotal += poseScore * CHECKS.poseConfidence.weight;

    // 2. Ball Tracking Confidence
    const ballScore = Math.min(1, sessionData.avgBallConfidence / CHECKS.ballConfidence.threshold);
    checks.push({
      ...CHECKS.ballConfidence,
      value: sessionData.avgBallConfidence,
      score: ballScore,
      passed: sessionData.avgBallConfidence >= CHECKS.ballConfidence.threshold,
    });
    weightedTotal += ballScore * CHECKS.ballConfidence.weight;

    // 3. Body Visibility
    const visScore = Math.min(1, sessionData.bodyVisibilityPercent / 80);
    checks.push({
      ...CHECKS.bodyVisibility,
      value: sessionData.bodyVisibilityPercent / 100,
      score: visScore,
      passed: sessionData.bodyVisibilityPercent >= 80,
    });
    weightedTotal += visScore * CHECKS.bodyVisibility.weight;

    // 4. Motion Consistency (no teleporting ball)
    const motionScore = sessionData.maxBallJump < 200 ? 1.0 : Math.max(0, 1 - (sessionData.maxBallJump - 200) / 200);
    checks.push({
      ...CHECKS.motionConsistency,
      value: motionScore,
      score: motionScore,
      passed: motionScore >= 0.80,
    });
    weightedTotal += motionScore * CHECKS.motionConsistency.weight;

    // 5. Velocity Sanity
    const velScore = sessionData.maxBallAccel < 500 ? 1.0 : Math.max(0, 1 - (sessionData.maxBallAccel - 500) / 500);
    checks.push({
      ...CHECKS.velocitySanity,
      value: velScore,
      score: velScore,
      passed: velScore >= 0.80,
    });
    weightedTotal += velScore * CHECKS.velocitySanity.weight;

    const isVerified = weightedTotal >= 0.70;

    return {
      checks,
      overallScore: weightedTotal,
      isVerified,
      badge: isVerified ? 'VERIFIED' : 'UNVERIFIED',
    };
  }
}

export default VerificationEngine;
