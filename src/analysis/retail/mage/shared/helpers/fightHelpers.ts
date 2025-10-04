import Analyzer from 'parser/core/Analyzer';
import type CombatLogParser from 'parser/core/CombatLogParser';

/**
 * Fight Context Helpers
 *
 * These helpers provide easy access to fight timing information without needing to
 * manually calculate timestamps or access the owner object. All functions take an
 * Analyzer instance and automatically extract fight timing data.
 *
 * Common use cases:
 * - Adjusting evaluation thresholds during opener vs regular gameplay
 * - Being lenient on cooldown usage near fight end
 * - Detecting short fights where some abilities may not be used
 */

/**
 * Context information about fight timing.
 * Contains both boolean flags for common checks and raw timing data.
 */
export interface FightContext {
  /** True if within the first 20 seconds of the fight (opener phase) */
  isOpener: boolean;
  /** True if less than 1 minute remaining in fight */
  isShortFight: boolean;
  /** True if less than 5 seconds remaining in fight (execute phase) */
  isFightEnd: boolean;
  /** Milliseconds elapsed since fight start */
  timeSinceStart: number;
  /** Milliseconds remaining until fight end */
  timeUntilEnd: number;
}

/**
 * Get comprehensive fight context information.
 *
 * This is the primary function - use it when you need multiple timing checks
 * or raw timing values. For single checks, use the convenience functions below.
 *
 * @param analyzer - The analyzer instance (provides access to fight timing via owner)
 * @param timestamp - The timestamp to evaluate context for (typically event.timestamp)
 * @returns Complete fight context with boolean flags and timing values
 *
 * @example
 * ```typescript
 * // Example: Adjust mana thresholds based on fight phase
 * onArcaneSurge(event: CastEvent) {
 *   const context = getFightContext(this, event.timestamp);
 *   const mana = getManaPercentage(event);
 *
 *   let performance: QualitativePerformance;
 *   if (context.isOpener) {
 *     // Stricter threshold during opener - should be near 100%
 *     performance = evaluatePerformance(mana, { minor: 0.95, average: 0.90, major: 0.85 }, true);
 *   } else if (context.isFightEnd) {
 *     // More lenient at fight end - burn remaining mana
 *     performance = evaluatePerformance(mana, { minor: 0.50, average: 0.30, major: 0.10 }, true);
 *   } else {
 *     // Normal thresholds during middle of fight
 *     performance = evaluatePerformance(mana, { minor: 0.80, average: 0.70, major: 0.60 }, true);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Example: Check if cooldown usage makes sense
 * onTouchOfTheMagi(event: ApplyDebuffEvent) {
 *   const context = getFightContext(this, event.timestamp);
 *
 *   // Don't penalize holding Touch if fight is almost over
 *   if (context.isFightEnd) {
 *     return QualitativePerformance.Good; // Any usage at fight end is fine
 *   }
 *
 *   // During opener, expect Touch to be used early
 *   if (context.isOpener && context.timeSinceStart > 15000) {
 *     return QualitativePerformance.Ok; // Slightly delayed opener
 *   }
 * }
 * ```
 */
export function getFightContext(analyzer: Analyzer, timestamp: number): FightContext {
  const owner = (analyzer as unknown as { owner: CombatLogParser }).owner;
  const fightStart = owner.fight.start_time;
  const fightEnd = owner.fight.end_time;
  const timeSinceStart = timestamp - fightStart;
  const timeUntilEnd = fightEnd - timestamp;

  return {
    isOpener: timeSinceStart < 20000, // 20 seconds
    isShortFight: timeUntilEnd < 60000, // 1 minute
    isFightEnd: timeUntilEnd < 5000, // 5 seconds
    timeSinceStart,
    timeUntilEnd,
  };
}

/**
 * Check if a timestamp is during the opener phase (first 20 seconds).
 *
 * Use this when you only need to check if you're in the opener without
 * needing other timing information.
 *
 * @param analyzer - The analyzer instance
 * @param timestamp - The timestamp to check (typically event.timestamp)
 * @returns true if within first 20 seconds of fight
 *
 * @example
 * ```typescript
 * // Example: Different expectations for opener vs regular play
 * if (isDuringOpener(this, cast.timestamp)) {
 *   // During opener, expect higher charges
 *   if (charges < 3) {
 *     return QualitativePerformance.Ok;
 *   }
 * } else {
 *   // During regular play, 2+ charges is fine
 *   if (charges < 2) {
 *     return QualitativePerformance.Ok;
 *   }
 * }
 * ```
 */
export function isDuringOpener(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isOpener;
}

/**
 * Check if a timestamp is near the end of the fight (< 5 seconds remaining).
 *
 * Use this to be lenient on resource usage, cooldown holds, or other decisions
 * that don't matter when the fight is about to end.
 *
 * @param analyzer - The analyzer instance
 * @param timestamp - The timestamp to check (typically event.timestamp)
 * @returns true if less than 5 seconds remaining in fight
 *
 * @example
 * ```typescript
 * // Example: Don't penalize holding cooldowns at fight end
 * if (isNearFightEnd(this, event.timestamp)) {
 *   return QualitativePerformance.Good; // Any usage is fine
 * }
 *
 * // Normal evaluation for mid-fight
 * return this.evaluateCooldownUsage(event);
 * ```
 */
export function isNearFightEnd(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isFightEnd;
}

/**
 * Check if the fight is short (< 1 minute remaining).
 *
 * Use this to detect short fights where some cooldowns may not be worth using
 * or where different strategies apply.
 *
 * @param analyzer - The analyzer instance
 * @param timestamp - The timestamp to check (typically event.timestamp)
 * @returns true if less than 1 minute remaining in fight
 *
 * @example
 * ```typescript
 * // Example: Adjust expectations for long cooldowns in short fights
 * if (isShortFight(this, event.timestamp)) {
 *   // Don't expect players to use 3-minute cooldowns if fight is almost over
 *   return QualitativePerformance.Good;
 * }
 * ```
 */
export function isShortFight(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isShortFight;
}
