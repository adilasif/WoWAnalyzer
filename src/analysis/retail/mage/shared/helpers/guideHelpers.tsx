import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { PerformanceMark } from 'interface/guide';
import Spell from 'common/SPELLS/Spell';
import { CastEvent } from 'parser/core/Events';

/**
 * Guide Helper Functions
 * Pure utility functions for guide generation and performance evaluation
 */

// =============================================================================
// TOOLTIP GENERATION
// =============================================================================

/**
 * Generates a standardized tooltip for guide performance entries.
 * This standalone function was extracted from BaseMageGuide to reduce unnecessary inheritance.
 *
 * @param formatTimestamp - Function to format the timestamp (typically from `owner.formatTimestamp`)
 * @param performance - Overall performance level for this entry
 * @param tooltipItems - Array of performance details to display
 * @param timestamp - Timestamp of the event for display
 * @returns JSX tooltip element
 *
 * @example
 * ```tsx
 * // In a guide component
 * const tooltip = generateGuideTooltip(
 *   this.owner.formatTimestamp.bind(this.owner),
 *   QualitativePerformance.Good,
 *   [
 *     { perf: QualitativePerformance.Perfect, detail: 'Good mana (85%)' },
 *     { perf: QualitativePerformance.Ok, detail: 'Acceptable target health (45%)' }
 *   ],
 *   event.timestamp
 * );
 * ```
 */
export function generateGuideTooltip(
  formatTimestamp: (timestamp: number) => string,
  performance: QualitativePerformance,
  tooltipItems: { perf: QualitativePerformance; detail: string }[],
  timestamp: number,
): JSX.Element {
  return (
    <>
      <div>
        <b>@ {formatTimestamp(timestamp)}</b>
      </div>
      <div>
        <PerformanceMark perf={performance} /> {performance}
      </div>
      <div>
        {tooltipItems.map((t, i) => (
          <div key={i}>
            <PerformanceMark perf={t.perf} /> {t.detail}
            <br />
          </div>
        ))}
      </div>
    </>
  );
}

// =============================================================================
// PERFORMANCE EVALUATION
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

// =============================================================================
// BOX ROW ENTRY CREATION
// =============================================================================

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

// =============================================================================
// EXPANDABLE CONFIG HELPERS
// =============================================================================

/**
 * Configuration for auto-generating expandable breakdown components
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
  /** Optional: Function to get cast events for timeline display */
  getCastEvents?: (data: unknown) => CastEvent[];
  /** Optional: Description for the cast timeline window */
  castTimelineDescription?: string;
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
 * @param config Configuration for the expandable
 * @param config.spell The spell/ability to show in the header
 * @param config.formatTimestamp Function to format timestamps for display
 * @param config.getTimestamp Function to extract timestamp from cast data
 * @param config.checklistItems Array of checklist item configurations
 * @param config.getCastEvents Optional function to get cast events for timeline display
 * @param config.castTimelineDescription Optional description for the cast timeline window
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
  getCastEvents?: (cast: unknown) => CastEvent[];
  castTimelineDescription?: string;
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
    getCastEvents: config.getCastEvents,
    castTimelineDescription: config.castTimelineDescription,
  };
}
