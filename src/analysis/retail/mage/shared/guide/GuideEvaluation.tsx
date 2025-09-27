import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';

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
export function evaluateGuide<T = GuideData>(
  timestamp: number,
  data: T,
  guide: TooltipProvider,
  config: GuideEvaluationConfig,
): BoxRowEntry {
  // Step 1: Check fail conditions - any condition that makes the cast a failure
  // This includes prerequisites not met, mistakes made, etc.
  if (config.failConditions) {
    for (const condition of config.failConditions) {
      if (condition.check) {
        return createTooltipEntry(
          guide,
          QualitativePerformance.Fail,
          condition.description,
          timestamp,
        );
      }
    }
  }

  // Step 2: Check perfect conditions (any match = perfect)
  if (config.perfectConditions) {
    for (const condition of config.perfectConditions) {
      if (condition.check) {
        return createTooltipEntry(
          guide,
          QualitativePerformance.Perfect,
          condition.description,
          timestamp,
        );
      }
    }
  }

  // Step 3: Check good conditions (any match = good)
  if (config.goodConditions) {
    for (const condition of config.goodConditions) {
      if (condition.check) {
        return createTooltipEntry(
          guide,
          QualitativePerformance.Good,
          condition.description,
          timestamp,
        );
      }
    }
  }

  // Step 4: Check ok conditions (any match = ok)
  if (config.okConditions) {
    for (const condition of config.okConditions) {
      if (condition.check) {
        return createTooltipEntry(
          guide,
          QualitativePerformance.Ok,
          condition.description,
          timestamp,
        );
      }
    }
  }

  // Step 5: Default fallback
  return createTooltipEntry(
    guide,
    config.defaultPerformance || QualitativePerformance.Ok,
    config.defaultMessage || `${config.actionName} without specific conditions`,
    timestamp,
  );
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
 * Utility functions for creating common guide conditions
 */
export class GuideConditions {
  /**
   * Creates a condition for checking resource requirements (charges, mana, etc.)
   * Note: Returns a condition that fails when resources are insufficient
   */
  static hasResource(
    name: string,
    current: number,
    required: number,
    resourceName: string,
  ): GuideCondition {
    return {
      name,
      check: current < required, // true = insufficient resources = fail condition
      description: `Insufficient ${resourceName} (${current}/${required})`,
    };
  }

  /**
   * Creates a condition for checking if a buff/proc is active
   */
  static hasProc(name: string, active: boolean, procName: string): GuideCondition {
    return {
      name,
      check: active,
      description: `${procName} proc active`,
    };
  }

  /**
   * Creates a condition for checking if a buff/proc is missing when required
   */
  static missingRequiredProc(name: string, active: boolean, procName: string): GuideCondition {
    return {
      name,
      check: !active,
      description: `Missing required ${procName} proc`,
    };
  }

  /**
   * Creates a condition for checking target count (AOE scenarios)
   */
  static targetsHit(name: string, targets: number, threshold: number): GuideCondition {
    return {
      name,
      check: targets >= threshold,
      description: `Hit ${targets} targets (${threshold}+ ideal)`,
    };
  }

  /**
   * Creates a condition for emergency situations (low health/mana)
   */
  static emergency(
    name: string,
    value: number,
    threshold: number,
    resourceName: string,
  ): GuideCondition {
    return {
      name,
      check: value <= threshold,
      description: `Emergency ${resourceName} situation (${Math.round(value * 100)}%)`,
    };
  }

  /**
   * Creates a condition for timing-based checks (buff about to expire, etc.)
   */
  static timeRemaining(
    name: string,
    remaining: number,
    threshold: number,
    description: string,
  ): GuideCondition {
    return {
      name,
      check: remaining <= threshold,
      description,
    };
  }

  /**
   * Creates a condition for combo/synergy checks
   */
  static combo(name: string, condition: boolean, description: string): GuideCondition {
    return {
      name,
      check: condition,
      description,
    };
  }
}
