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
 * Represents a condition that can be evaluated for guide performance
 */
export interface GuideCondition {
  name: string;
  check: boolean;
  description: string;
}

/**
 * Represents a requirement that must be met for a guide evaluation to be valid
 */
export interface GuideRequirement {
  name: string;
  check: boolean;
  failureMessage: string;
}

/**
 * Configuration for evaluating any action using the universal guide evaluation system
 */
export interface GuideEvaluationConfig {
  actionName: string;

  // Optional requirements (checked first)
  requirements?: GuideRequirement[];

  // Performance conditions (checked in priority order)
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
 * This function implements the "Any One Good Reason" philosophy:
 * - If you have ANY valid reason for an action, the action is good
 * - Evaluation stops at the first matching condition
 * - No complex rule combinations to understand
 *
 * @param data - The action data (must have timestamp property)
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
  // Step 1: Check requirements (any failure = auto-fail)
  if (config.requirements) {
    for (const req of config.requirements) {
      if (!req.check) {
        return createTooltipEntry(
          guide,
          QualitativePerformance.Fail,
          req.failureMessage,
          timestamp,
        );
      }
    }
  }

  // Step 2: Check fail conditions (any match = fail)
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

  // Step 3: Check perfect conditions (any match = perfect)
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

  // Step 4: Check good conditions (any match = good)
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

  // Step 5: Check ok conditions (any match = ok)
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

  // Step 6: Default fallback
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
   */
  static hasResource(
    name: string,
    current: number,
    required: number,
    resourceName: string,
  ): GuideRequirement {
    return {
      name,
      check: current >= required,
      failureMessage: `Insufficient ${resourceName} (${current}/${required})`,
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
