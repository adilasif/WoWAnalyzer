import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import Spell from 'common/SPELLS/Spell';

export type GuideData = Record<string, unknown>;
/**
 * Interface for objects that can generate guide tooltips
 */
export interface TooltipProvider {
  generateGuideTooltip: (
    performance: QualitativePerformance,
    tooltipItems: Array<{ perf: QualitativePerformance; detail: string }>,
    timestamp: number,
  ) => JSX.Element;
}

/**
 * Represents a condition that can result in performance evaluation.
 * Used for fail/perfect/good/ok conditions.
 */
export interface GuideCondition {
  name: string;
  check: boolean; // true means this condition is met
  description: string; // what to show in tooltip when this condition triggers
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
 * @param guide - Guide instance that can generate tooltips
 * @param config - Evaluation configuration specifying conditions
 * @returns BoxRowEntry for use in PerformanceBoxRow
 */
export function evaluateEvent<T = GuideData>(
  timestamp: number,
  data: T,
  guide: TooltipProvider,
  config: GuideEvaluationConfig,
): BoxRowEntry {
  let finalEvaluation: BoxRowEntry | null = null;

  // Step 1: Check fail conditions - any condition that makes the cast a failure
  // This includes prerequisites not met, mistakes made, etc.
  if (config.failConditions) {
    for (const condition of config.failConditions) {
      if (condition.check) {
        finalEvaluation = createTooltipEntry(
          guide,
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
      if (condition.check) {
        finalEvaluation = createTooltipEntry(
          guide,
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
      if (condition.check) {
        finalEvaluation = createTooltipEntry(
          guide,
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
      if (condition.check) {
        finalEvaluation = createTooltipEntry(
          guide,
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
      guide,
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
  guide: TooltipProvider,
  performance: QualitativePerformance,
  message: string,
  timestamp: number,
): BoxRowEntry {
  const tooltipItems = [{ perf: performance, detail: message }];
  const tooltip = guide.generateGuideTooltip(performance, tooltipItems, timestamp);
  return { value: performance, tooltip };
}

/**
 * Configuration for auto-generating expandable breakdown components from evaluateEvent data
 */
export interface ExpandableConfig {
  /** The spell/ability to show in the header */
  spell: Spell;
  /** Function to format the timestamp for the header */
  formatTimestamp: (timestamp: number) => string;
  /** Function to extract the timestamp from cast data */
  getTimestamp: (data: unknown) => number;
  /** Array of checklist item configurations */
  checklistItems: ExpandableChecklistItem[];
}

/**
 * Configuration for individual checklist items in expandable components
 */
export interface ExpandableChecklistItem {
  /** Label to display for this checklist item */
  label: JSX.Element;
  /** Function to extract the pass/fail result from cast data */
  getResult: (data: unknown, evaluatedData: BoxRowEntry) => boolean;
  /** Function to get descriptive details from cast data */
  getDetails: (data: unknown) => string;
}

/**
 * Helper function to create an ExpandableConfig with clean, simple parameters.
 * Reduces boilerplate when setting up expandable breakdowns.
 */
export function createExpandableConfig(config: {
  spell: Spell;
  formatTimestamp: (timestamp: number) => string;
  getTimestamp: (cast: unknown) => number;
  checklistItems: Array<{
    label: JSX.Element;
    getResult: (cast: unknown, evaluatedData: BoxRowEntry) => boolean;
    getDetails: (cast: unknown) => string;
  }>;
}): ExpandableConfig {
  return {
    spell: config.spell,
    formatTimestamp: config.formatTimestamp,
    getTimestamp: config.getTimestamp,
    checklistItems: config.checklistItems.map((item) => ({
      label: item.label,
      getResult: item.getResult,
      getDetails: item.getDetails,
    })),
  };
}

// =============================================================================
// PERFORMANCE UTILITIES
// Previously in PerformanceUtils.tsx, now consolidated here
// =============================================================================

/**
 * Universal performance evaluation method that handles all threshold-based scenarios.
 * Consolidates all performance evaluation patterns into a single flexible method.
 *
 * @param actual - The actual measured value
 * @param thresholds - Threshold object with minor/average/major properties
 * @param isGreaterThan - True if higher values are better, false if lower values are better
 * @returns QualitativePerformance level (Perfect/Good/Ok/Fail)
 *
 * @example
 * // Active time (higher is better): 85% with thresholds 80%/60%/40%
 * evaluatePerformance(0.85, {minor: 0.8, average: 0.6, major: 0.4}, true) // => Perfect
 *
 * // Cast delay (lower is better): 500ms with thresholds 200ms/500ms/1000ms
 * evaluatePerformance(500, {minor: 200, average: 500, major: 1000}, false) // => Good
 *
 * // Charge efficiency (lower is better): 2 charges with thresholds 2/3/4
 * evaluatePerformance(2, {minor: 2, average: 3, major: 4}, false) // => Perfect
 */
export function evaluatePerformance(
  actual: number,
  thresholds: { minor: number; average: number; major: number },
  isGreaterThan = true,
): QualitativePerformance {
  if (isGreaterThan) {
    if (actual >= thresholds.minor) {
      return QualitativePerformance.Perfect;
    } else if (actual >= thresholds.average) {
      return QualitativePerformance.Good;
    } else if (actual >= thresholds.major) {
      return QualitativePerformance.Ok;
    }
  } else {
    if (actual < thresholds.minor) {
      return QualitativePerformance.Perfect;
    } else if (actual < thresholds.average) {
      return QualitativePerformance.Good;
    } else if (actual < thresholds.major) {
      return QualitativePerformance.Ok;
    }
  }
  return QualitativePerformance.Fail;
}

/**
 * Creates a performance-based BoxRowEntry with tooltip.
 * Commonly used pattern for cast analysis displays.
 *
 * @param performance - Performance level for this entry
 * @param tooltip - Tooltip content to display
 * @returns BoxRowEntry for use in PerformanceBoxRow
 */
export function createBoxRowEntry(
  performance: QualitativePerformance,
  tooltip: JSX.Element,
): BoxRowEntry {
  return {
    value: performance,
    tooltip,
  };
}

/**
 * Creates a simple performance entry for boolean conditions.
 * Useful for simple pass/fail evaluations.
 *
 * @param passed - Whether the condition was met
 * @param tooltip - Tooltip content to display
 * @returns BoxRowEntry with Good/Fail performance
 */
export function createSimpleEntry(passed: boolean, tooltip: JSX.Element): BoxRowEntry {
  return {
    value: passed ? QualitativePerformance.Good : QualitativePerformance.Fail,
    tooltip,
  };
}

/**
 * Convenience method for boolean evaluations.
 *
 * @param condition - The boolean condition to evaluate
 * @param invertLogic - If true, false condition = Good, true condition = Fail (for negative conditions like "expired" or "overcapped")
 * @returns Performance level
 *
 * @example
 * // For positive conditions (higher is better)
 * evaluateBoolean(hasCorrectBuff, false); // true = Good, false = Fail
 *
 * // For negative conditions (lower is better)
 * evaluateBoolean(wasOvercapped, true); // false = Good, true = Fail
 */
export function evaluateBoolean(condition: boolean, invertLogic = false): QualitativePerformance {
  const result = invertLogic ? !condition : condition;
  return result ? QualitativePerformance.Good : QualitativePerformance.Fail;
}

/**
 * Standardized evaluation helper for event data that reduces boilerplate.
 * Common pattern: map over events and evaluate each one with similar structure.
 *
 * @param events - Array of event data to evaluate
 * @param evaluationLogic - Function that takes an event and returns evaluation config
 * @param guide - Guide instance for tooltip generation
 * @returns Array of BoxRowEntry evaluations
 *
 * @example
 * get arcaneOrbData(): BoxRowEntry[] {
 *   return evaluateEvents(
 *     this.arcaneOrb.orbCasts,
 *     (cast) => ({
 *       actionName: 'Arcane Orb',
 *       failConditions: [
 *         { name: 'missed', check: !cast.hitTargets, description: 'Failed to hit targets' }
 *       ],
 *       perfectConditions: [
 *         { name: 'optimal', check: cast.hitTargets && cast.chargesBefore <= 2, description: 'Perfect usage' }
 *       ],
 *     }),
 *     this
 *   );
 * }
 */
export function evaluateEvents<
  T extends { timestamp?: number; applied?: number; cast?: { timestamp: number } },
>(
  events: T[],
  evaluationLogic: (event: T) => GuideEvaluationConfig,
  guide: TooltipProvider,
): BoxRowEntry[] {
  return events.map((event: T) => {
    const timestamp = event.timestamp || event.applied || event.cast?.timestamp || 0;
    return evaluateEvent(timestamp, event, guide, evaluationLogic(event));
  });
}

/**
 * Helper for common fight duration checks to reduce duplication.
 */
export function getFightContext(
  guide: TooltipProvider & { owner: { fight: { start_time: number; end_time: number } } },
  timestamp: number,
) {
  const fightStart = guide.owner.fight.start_time;
  const fightEnd = guide.owner.fight.end_time;
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
