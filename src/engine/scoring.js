// ============================================
// STEP 4: Scoring Engine
// Combo system, multipliers, drop detection
// ============================================

export const COMBO_TIERS = [
  { min: 0, max: 9, multiplier: 1.0, label: '' },
  { min: 10, max: 19, multiplier: 1.5, label: '1.5x' },
  { min: 20, max: 29, multiplier: 2.0, label: '2x' },
  { min: 30, max: Infinity, multiplier: 2.5, label: '2.5x' },
];

export class ScoringEngine {
  constructor() {
    this.totalScore = 0;
    this.totalTouches = 0;
    this.currentCombo = 0;
    this.bestCombo = 0;
    this.drops = 0;
    this.touchHistory = [];
    this.onScoreUpdate = null;
    this.onComboBroken = null;
    this.onComboMilestone = null;
  }

  getMultiplier() {
    for (const tier of COMBO_TIERS) {
      if (this.currentCombo >= tier.min && this.currentCombo <= tier.max) {
        return tier;
      }
    }
    return COMBO_TIERS[0];
  }

  registerTouch(touchData) {
    this.currentCombo++;
    this.totalTouches++;

    const tier = this.getMultiplier();
    const points = 1 * tier.multiplier;
    this.totalScore += points;

    if (this.currentCombo > this.bestCombo) {
      this.bestCombo = this.currentCombo;
    }

    const scoreData = {
      touchId: touchData.id,
      points,
      multiplier: tier.multiplier,
      multiplierLabel: tier.label,
      combo: this.currentCombo,
      totalScore: this.totalScore,
    };

    this.touchHistory.push(scoreData);

    // Check combo milestones
    if ([10, 20, 30, 50].includes(this.currentCombo) && this.onComboMilestone) {
      this.onComboMilestone(this.currentCombo, tier.label);
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate(scoreData);
    }

    return scoreData;
  }

  registerDrop() {
    this.drops++;
    const brokenCombo = this.currentCombo;
    this.currentCombo = 0;

    if (brokenCombo > 0 && this.onComboBroken) {
      this.onComboBroken(brokenCombo);
    }

    return brokenCombo;
  }

  getSessionData() {
    return {
      totalScore: Math.round(this.totalScore * 10) / 10,
      totalTouches: this.totalTouches,
      bestCombo: this.bestCombo,
      drops: this.drops,
      currentCombo: this.currentCombo,
      multiplier: this.getMultiplier(),
    };
  }

  reset() {
    this.totalScore = 0;
    this.totalTouches = 0;
    this.currentCombo = 0;
    this.bestCombo = 0;
    this.drops = 0;
    this.touchHistory = [];
  }
}

export default ScoringEngine;
