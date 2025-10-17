import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import GuideTooltip from './guide/GuideTooltip';
import type { ExpandableConfig, ExpandableChecklistItem } from './guide/ExpandableBreakdown';

export { type ExpandableConfig, type ExpandableChecklistItem };

export interface GuideCondition {
  name: string;
  check: boolean;
  description: string;
  active?: boolean;
}

export interface GuideEvaluationConfig {
  actionName: string;
  failConditions?: GuideCondition[];
  perfectConditions?: GuideCondition[];
  goodConditions?: GuideCondition[];
  okConditions?: GuideCondition[];
  defaultPerformance?: QualitativePerformance;
  defaultMessage?: string;
}

/**
 * Internal evaluation function.
 * @param timestamp When the action occurred
 * @param data The action data
 * @param formatTimestamp Function to format timestamps for tooltips
 * @param config Evaluation configuration
 * @returns BoxRowEntry for use in PerformanceBoxRow
 */
function _evaluateEvent<T>(
  timestamp: number,
  data: T,
  formatTimestamp: (timestamp: number) => string,
  config: GuideEvaluationConfig,
): BoxRowEntry {
  let finalEvaluation: BoxRowEntry | null = null;

  if (config.failConditions) {
    for (const condition of config.failConditions) {
      if (condition.active !== false && condition.check) {
        finalEvaluation = createTooltipEntry(
          formatTimestamp,
          QualitativePerformance.Fail,
          condition.description,
          timestamp,
        );
        break;
      }
    }
  }

  if (!finalEvaluation && config.perfectConditions) {
    for (const condition of config.perfectConditions) {
      if (condition.active !== false && condition.check) {
        finalEvaluation = createTooltipEntry(
          formatTimestamp,
          QualitativePerformance.Perfect,
          condition.description,
          timestamp,
        );
        break;
      }
    }
  }

  if (!finalEvaluation && config.goodConditions) {
    for (const condition of config.goodConditions) {
      if (condition.active !== false && condition.check) {
        finalEvaluation = createTooltipEntry(
          formatTimestamp,
          QualitativePerformance.Good,
          condition.description,
          timestamp,
        );
        break;
      }
    }
  }

  if (!finalEvaluation && config.okConditions) {
    for (const condition of config.okConditions) {
      if (condition.active !== false && condition.check) {
        finalEvaluation = createTooltipEntry(
          formatTimestamp,
          QualitativePerformance.Ok,
          condition.description,
          timestamp,
        );
        break;
      }
    }
  }

  if (!finalEvaluation) {
    finalEvaluation = createTooltipEntry(
      formatTimestamp,
      config.defaultPerformance || QualitativePerformance.Ok,
      config.defaultMessage || `${config.actionName} without specific conditions`,
      timestamp,
    );
  }

  return finalEvaluation;
}

/**
 * Helper to create BoxRowEntry with tooltip.
 * @param formatTimestamp Function to format timestamps for tooltips
 * @param performance Performance level
 * @param message Tooltip message
 * @param timestamp Event timestamp
 * @returns BoxRowEntry
 */
function createTooltipEntry(
  formatTimestamp: (timestamp: number) => string,
  performance: QualitativePerformance,
  message: string,
  timestamp: number,
): BoxRowEntry {
  const tooltipItems = [{ perf: performance, detail: message }];
  const tooltip = (
    <GuideTooltip
      formatTimestamp={formatTimestamp}
      performance={performance}
      tooltipItems={tooltipItems}
      timestamp={timestamp}
    />
  );
  return { value: performance, tooltip };
}

/**
 * Evaluates events using standardized evaluation logic.
 * @param config Configuration object
 * @param config.events Array of event data to evaluate
 * @param config.evaluationLogic Function that returns evaluation config for each event
 * @param config.formatTimestamp Function to format timestamps for tooltips
 * @returns Array of BoxRowEntry evaluations
 */
export function evaluateEvents<
  T extends { timestamp?: number; applied?: number; cast?: { timestamp: number } },
>(config: {
  events: T[];
  evaluationLogic: (event: T) => GuideEvaluationConfig;
  formatTimestamp: (timestamp: number) => string;
}): BoxRowEntry[] {
  return config.events.map((event: T) => {
    const timestamp = event.timestamp || event.applied || event.cast?.timestamp || 0;
    return _evaluateEvent(timestamp, event, config.formatTimestamp, config.evaluationLogic(event));
  });
}
