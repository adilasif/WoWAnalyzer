import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import Analyzer from 'parser/core/Analyzer';
import type CombatLogParser from 'parser/core/CombatLogParser';
import {
  generateGuideTooltip,
  evaluatePerformance,
  evaluateBoolean,
  createBoxRowEntry,
  createSimpleEntry,
  createExpandableConfig,
  type ExpandableConfig,
  type ExpandableChecklistItem,
} from '../helpers/guideHelpers';
import { getFightContext } from '../helpers/fightHelpers';

// Re-export for backwards compatibility
export {
  generateGuideTooltip,
  evaluatePerformance,
  evaluateBoolean,
  createBoxRowEntry,
  createSimpleEntry,
  createExpandableConfig,
  getFightContext,
  type ExpandableConfig,
  type ExpandableChecklistItem,
};

export type GuideData = Record<string, unknown>;

/**
 * Represents a condition that can result in performance evaluation.
 * Used for fail/perfect/good/ok conditions.
 */
export interface GuideCondition {
  name: string;
  check: boolean; // true means this condition is met
  description: string; // what to show in tooltip when this condition triggers
  active?: boolean; // if false, skip this condition entirely (defaults to true)
}

/**
 * Configuration for evaluating any action using the universal guide evaluation system
 */
export interface GuideEvaluationConfig {
  actionName: string;

  // Conditions that result in failure (prerequisites not met, mistakes made, etc.)
  failConditions?: GuideCondition[];
  perfectConditions?: GuideCondition[];
  goodConditions?: GuideCondition[];
  okConditions?: GuideCondition[];

  // Default performance if no conditions match
  defaultPerformance?: QualitativePerformance;
  defaultMessage?: string;
}

/**
 * Internal evaluation function - use evaluateEvents instead.
 *
 * Universal guide evaluation function that handles ALL action types.
 *
 * Evaluation Order:
 * 1. failConditions - Any condition that results in failure (auto-fail if true)
 * 2. perfectConditions - Check for perfect execution
 * 3. goodConditions - Check for good execution
 * 4. okConditions - Check for acceptable execution
 * 5. Default fallback performance
 *
 * Philosophy: "Any One Good Reason" - if you have ANY valid reason for an action, it's good.
 * But critical mistakes override everything.
 *
 * @param timestamp - When the action occurred
 * @param data - The action data
 * @param analyzer - Analyzer instance (used for formatTimestamp via owner.formatTimestamp)
 * @param config - Evaluation configuration specifying conditions
 * @returns BoxRowEntry for use in PerformanceBoxRow
 */
function _evaluateEvent<T = GuideData>(
  timestamp: number,
  data: T,
  analyzer: Analyzer,
  config: GuideEvaluationConfig,
): BoxRowEntry {
  let finalEvaluation: BoxRowEntry | null = null;

  // Step 1: Check fail conditions - any condition that makes the cast a failure
  // This includes prerequisites not met, mistakes made, etc.
  if (config.failConditions) {
    for (const condition of config.failConditions) {
      if (condition.active !== false && condition.check) {
        finalEvaluation = createTooltipEntry(
          analyzer,
          QualitativePerformance.Fail,
          condition.description,
          timestamp,
        );
        break;
      }
    }
  }

  // Step 2: Check perfect conditions (any match = perfect)
  if (!finalEvaluation && config.perfectConditions) {
    for (const condition of config.perfectConditions) {
      if (condition.active !== false && condition.check) {
        finalEvaluation = createTooltipEntry(
          analyzer,
          QualitativePerformance.Perfect,
          condition.description,
          timestamp,
        );
        break;
      }
    }
  }

  // Step 3: Check good conditions (any match = good)
  if (!finalEvaluation && config.goodConditions) {
    for (const condition of config.goodConditions) {
      if (condition.active !== false && condition.check) {
        finalEvaluation = createTooltipEntry(
          analyzer,
          QualitativePerformance.Good,
          condition.description,
          timestamp,
        );
        break;
      }
    }
  }

  // Step 4: Check ok conditions (any match = ok)
  if (!finalEvaluation && config.okConditions) {
    for (const condition of config.okConditions) {
      if (condition.active !== false && condition.check) {
        finalEvaluation = createTooltipEntry(
          analyzer,
          QualitativePerformance.Ok,
          condition.description,
          timestamp,
        );
        break;
      }
    }
  }

  // Step 5: Default fallback
  if (!finalEvaluation) {
    finalEvaluation = createTooltipEntry(
      analyzer,
      config.defaultPerformance || QualitativePerformance.Ok,
      config.defaultMessage || `${config.actionName} without specific conditions`,
      timestamp,
    );
  }

  return finalEvaluation;
}

/**
 * Helper function to create BoxRowEntry with proper tooltip integration
 */
function createTooltipEntry(
  analyzer: Analyzer,
  performance: QualitativePerformance,
  message: string,
  timestamp: number,
): BoxRowEntry {
  const tooltipItems = [{ perf: performance, detail: message }];
  const owner = (analyzer as unknown as { owner: CombatLogParser }).owner;
  const tooltip = generateGuideTooltip(
    owner.formatTimestamp.bind(owner),
    performance,
    tooltipItems,
    timestamp,
  );
  return { value: performance, tooltip };
}

/**
 * Standardized evaluation helper for event data that reduces boilerplate.
 *
 * @param events - Array of event data to evaluate
 * @param evaluationLogic - Function that takes an event and returns evaluation config
 * @param analyzer - Guide instance for tooltip generation
 * @returns Array of BoxRowEntry evaluations
 *
 * @example
 * // Object syntax
 * get arcaneOrbData(): BoxRowEntry[] {
 *   return evaluateEvents({
 *     events: this.arcaneOrb.orbCasts,
 *     evaluationLogic: (cast) => ({ ... }),
 *     analyzer: this,
 *   });
 * }
 */

// Object syntax overload
export function evaluateEvents<
  T extends { timestamp?: number; applied?: number; cast?: { timestamp: number } },
>(config: {
  events: T[];
  evaluationLogic: (event: T) => GuideEvaluationConfig;
  analyzer: Analyzer;
}): BoxRowEntry[];

// Positional parameters overload (legacy)
export function evaluateEvents<
  T extends { timestamp?: number; applied?: number; cast?: { timestamp: number } },
>(
  events: T[],
  evaluationLogic: (event: T) => GuideEvaluationConfig,
  analyzer: Analyzer,
): BoxRowEntry[];

// Implementation
export function evaluateEvents<
  T extends { timestamp?: number; applied?: number; cast?: { timestamp: number } },
>(
  eventsOrConfig:
    | T[]
    | { events: T[]; evaluationLogic: (event: T) => GuideEvaluationConfig; analyzer: Analyzer },
  evaluationLogic?: (event: T) => GuideEvaluationConfig,
  analyzer?: Analyzer,
): BoxRowEntry[] {
  // Handle both object and positional parameters
  let events: T[];
  let logic: (event: T) => GuideEvaluationConfig;
  let analyzerInstance: Analyzer;

  if (Array.isArray(eventsOrConfig)) {
    // Positional parameters
    events = eventsOrConfig;
    logic = evaluationLogic!;
    analyzerInstance = analyzer!;
  } else {
    // Object parameter
    events = eventsOrConfig.events;
    logic = eventsOrConfig.evaluationLogic;
    analyzerInstance = eventsOrConfig.analyzer;
  }

  return events.map((event: T) => {
    const timestamp = event.timestamp || event.applied || event.cast?.timestamp || 0;
    return _evaluateEvent(timestamp, event, analyzerInstance, logic(event));
  });
}
