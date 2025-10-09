import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { PerformanceMark } from 'interface/guide';
import Spell from 'common/SPELLS/Spell';

/**
 * Generates a standardized tooltip for guide performance entries.
 * @param formatTimestamp Function to format timestamps
 * @param performance Overall performance level
 * @param tooltipItems Array of performance details to display
 * @param timestamp Timestamp of the event
 * @returns JSX tooltip element
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

/**
 * Universal performance evaluation based on threshold comparison.
 * @param actual The actual measured value
 * @param thresholds Threshold object with minor/average/major properties
 * @param isGreaterThan True if higher values are better, false if lower values are better
 * @returns QualitativePerformance level
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
 * Performance evaluation for boolean conditions.
 * @param condition The boolean condition to evaluate
 * @param invertLogic If true, false = Good and true = Fail
 * @returns Performance level
 */
export function evaluateBoolean(condition: boolean, invertLogic = false): QualitativePerformance {
  const result = invertLogic ? !condition : condition;
  return result ? QualitativePerformance.Good : QualitativePerformance.Fail;
}

/**
 * Configuration for auto-generating expandable breakdown components.
 */
export interface ExpandableConfig {
  spell: Spell;
  formatTimestamp: (timestamp: number) => string;
  getTimestamp: (data: unknown) => number;
  checklistItems: ExpandableChecklistItem[];
}

/**
 * Configuration for individual checklist items in expandable components.
 */
export interface ExpandableChecklistItem {
  label: JSX.Element;
  getResult: (data: unknown, evaluatedData: BoxRowEntry) => boolean;
  getDetails: (data: unknown) => string;
}

/**
 * Creates an ExpandableConfig with simplified parameters.
 * @param config Configuration for the expandable
 * @param config.spell The spell/ability to show in the header
 * @param config.formatTimestamp Function to format timestamps
 * @param config.getTimestamp Function to extract timestamp from cast data
 * @param config.checklistItems Array of checklist item configurations
 * @returns ExpandableConfig object
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
