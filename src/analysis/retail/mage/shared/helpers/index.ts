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
  // Note: Buff/Cooldown/Event helpers are now provided by MageAnalyzer base class
  // Use this.getBuffStacks(), this.getCooldownRemaining(), this.getCastsInTimeWindow(), etc.
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
