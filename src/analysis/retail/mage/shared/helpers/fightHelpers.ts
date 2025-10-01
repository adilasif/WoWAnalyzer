import Analyzer from 'parser/core/Analyzer';
import type CombatLogParser from 'parser/core/CombatLogParser';

/**
 * Fight Context Helpers
 * Utilities for determining fight timing and context
 */

/**
 * Context information about fight timing
 */
export interface FightContext {
  /** True if within the first 20 seconds of the fight */
  isOpener: boolean;
  /** True if less than 1 minute remaining in fight */
  isShortFight: boolean;
  /** True if less than 5 seconds remaining in fight */
  isFightEnd: boolean;
  /** Milliseconds since fight start */
  timeSinceStart: number;
  /** Milliseconds until fight end */
  timeUntilEnd: number;
}

/**
 * Helper for common fight duration checks to reduce duplication.
 *
 * @param analyzer - The analyzer instance (used to access fight timing)
 * @param timestamp - The timestamp to evaluate context for
 * @returns Fight context information
 *
 * @example
 * ```tsx
 * const context = getFightContext(this, event.timestamp);
 * if (context.isOpener) {
 *   // Special opener logic
 * }
 * if (context.isFightEnd) {
 *   // End of fight considerations
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
 * Check if a timestamp is during the opener phase (first 20 seconds)
 */
export function isDuringOpener(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isOpener;
}

/**
 * Check if a timestamp is near the end of the fight (< 5 seconds remaining)
 */
export function isNearFightEnd(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isFightEnd;
}

/**
 * Check if the fight is short (< 1 minute remaining)
 */
export function isShortFight(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isShortFight;
}
