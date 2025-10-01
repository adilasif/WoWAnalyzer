// Event-related helpers
export {
  // Resource helpers
  getManaPercentage,
  getResourceAmount,
  getResourceMax,
  // Target helpers (require CastLinkNormalizer)
  getTargetHealthPercentage,
  getTargetsHitCount,
  getTargetsHit,
  // Buff helpers
  getBuffStacks,
  hasAnyBuff,
  hasAllBuffs,
  getBuffRemainingDuration,
  // Cooldown helpers
  getCooldownRemaining,
  isSpellAvailable,
  isSpellOnCooldown,
  // Fight context helpers
  isDuringOpener,
  isNearFightEnd,
  getFightTimeRemaining,
} from './eventHelpers';

// Guide-related helpers
export {
  generateGuideTooltip,
  evaluatePerformance,
  evaluateBoolean,
  createBoxRowEntry,
  createSimpleEntry,
  createExpandableConfig,
  type ExpandableConfig,
  type ExpandableChecklistItem,
} from './guideHelpers';

// Fight context helpers
export {
  getFightContext,
  isDuringOpener as isDuringOpenerFight,
  isNearFightEnd as isNearFightEndFight,
  isShortFight,
  type FightContext,
} from './fightHelpers';
