import Analyzer from 'parser/core/Analyzer';
import type CombatLogParser from 'parser/core/CombatLogParser';

export interface FightContext {
  isOpener: boolean;
  isShortFight: boolean;
  isFightEnd: boolean;
  timeSinceStart: number;
  timeUntilEnd: number;
}

/**
 * Gets comprehensive fight context information.
 * @param analyzer The analyzer instance
 * @param timestamp The timestamp to evaluate context for
 * @returns Complete fight context with boolean flags and timing values
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
 * Checks if a timestamp is during the opener phase.
 * @param analyzer The analyzer instance
 * @param timestamp The timestamp to check
 * @returns true if within first 20 seconds of fight
 */
export function isDuringOpener(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isOpener;
}

/**
 * Checks if a timestamp is near the end of the fight.
 * @param analyzer The analyzer instance
 * @param timestamp The timestamp to check
 * @returns true if less than 5 seconds remaining in fight
 */
export function isNearFightEnd(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isFightEnd;
}

/**
 * Checks if the fight is short.
 * @param analyzer The analyzer instance
 * @param timestamp The timestamp to check
 * @returns true if less than 1 minute remaining in fight
 */
export function isShortFight(analyzer: Analyzer, timestamp: number): boolean {
  return getFightContext(analyzer, timestamp).isShortFight;
}
