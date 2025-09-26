import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';

/**
 * Utility functions for evaluating performance and processing data
 * commonly used across mage guide components.
 */
export class PerformanceUtils {
  /**
   * Converts analyzer threshold values to QualitativePerformance levels.
   * Handles both "greater than" and "less than" threshold patterns.
   *
   * @param actual - The actual measured value
   * @param thresholds - Threshold object with minor/average/major properties
   * @param isGreaterThan - True if higher values are better, false if lower values are better
   * @returns QualitativePerformance level
   */
  static evaluatePerformance(
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
  static createBoxRowEntry(performance: QualitativePerformance, tooltip: JSX.Element): BoxRowEntry {
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
  static createSimpleEntry(passed: boolean, tooltip: JSX.Element): BoxRowEntry {
    return {
      value: passed ? QualitativePerformance.Good : QualitativePerformance.Fail,
      tooltip,
    };
  }

  /**
   * Common performance evaluation for buff expiration scenarios.
   * Many mage guides track whether buffs/procs expired unused.
   *
   * @param expired - Whether the buff/proc expired
   * @returns Performance level (Good if not expired, Fail if expired)
   */
  static evaluateBuffUsage(expired: boolean): QualitativePerformance {
    return expired ? QualitativePerformance.Fail : QualitativePerformance.Good;
  }

  /**
   * Common performance evaluation for overcapping scenarios.
   * Used when players waste resources by hitting caps.
   *
   * @param overcapped - Whether overcapping occurred
   * @returns Performance level (Fail if overcapped, Good otherwise)
   */
  static evaluateOvercapping(overcapped: boolean): QualitativePerformance {
    return overcapped ? QualitativePerformance.Fail : QualitativePerformance.Good;
  }

  /**
   * Evaluates cast efficiency based on charges/stacks before casting.
   * Common pattern for abilities that should be used at specific charge levels.
   *
   * @param chargesBefore - Number of charges/stacks before the cast
   * @param threshold - Maximum charges/stacks considered efficient
   * @returns Performance level
   */
  static evaluateCastEfficiency(chargesBefore: number, threshold: number): QualitativePerformance {
    return chargesBefore <= threshold ? QualitativePerformance.Good : QualitativePerformance.Fail;
  }
}
