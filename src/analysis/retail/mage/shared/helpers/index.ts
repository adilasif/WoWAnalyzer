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
  isBuffCapped,
  // Cooldown helpers
  getCooldownRemaining,
  isSpellAvailable,
  isSpellOnCooldown,
  // Event filtering helpers
  getCastsInTimeWindow,
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

// Cast Link helpers
export {
  EventRelations,
  LinkPatterns,
  createEventLinks,
  defineSpellLinks,
  type LinkConfig,
  type SpellLinkSpec,
} from './castLinkHelpers';

// Statistic helpers
export { StatisticBuilder, DropdownTableBuilder } from '../builders/StatisticBuilder';
