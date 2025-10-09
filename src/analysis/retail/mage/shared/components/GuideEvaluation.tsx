import { ReactNode, useState } from 'react';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { SpellSeq } from 'parser/ui/SpellSeq';
import { CastEvent } from 'parser/core/Events';
import Analyzer from 'parser/core/Analyzer';
import type CombatLogParser from 'parser/core/CombatLogParser';
import {
  generateGuideTooltip,
  type ExpandableConfig,
  type ExpandableChecklistItem,
} from '../helpers/guideHelpers';

export { type ExpandableConfig, type ExpandableChecklistItem };

/**
 * Represents a condition that can result in performance evaluation.
 * Used for fail/perfect/good/ok conditions.
 */
export interface GuideCondition {
  name: string;
  check: boolean;
  description: string;
  active?: boolean;
}

/**
 * Configuration for evaluating any action using the universal guide evaluation system
 */
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
function _evaluateEvent<T>(
  timestamp: number,
  data: T,
  analyzer: Analyzer,
  config: GuideEvaluationConfig,
): BoxRowEntry {
  let finalEvaluation: BoxRowEntry | null = null;

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
 * @param config - Configuration object
 * @param config.events - Array of event data to evaluate
 * @param config.evaluationLogic - Function that takes an event and returns evaluation config
 * @param config.analyzer - Analyzer instance for tooltip generation
 * @returns Array of BoxRowEntry evaluations
 *
 */
export function evaluateEvents<
  T extends { timestamp?: number; applied?: number; cast?: { timestamp: number } },
>(config: {
  events: T[];
  evaluationLogic: (event: T) => GuideEvaluationConfig;
  analyzer: Analyzer;
}): BoxRowEntry[] {
  return config.events.map((event: T) => {
    const timestamp = event.timestamp || event.applied || event.cast?.timestamp || 0;
    return _evaluateEvent(timestamp, event, config.analyzer, config.evaluationLogic(event));
  });
}

/**
 * Interface for cast timeline events
 * Each event represents a point in time with associated casts and a display header
 */
export interface CastTimelineEvent {
  timestamp: number;
  casts: CastEvent[];
  header: ReactNode;
}

/**
 * Props for the CastTimeline component
 */
interface CastTimelineProps {
  events: CastTimelineEvent[];
  windowDescription?: string;
  title?: string;
  formatTimestamp?: (timestamp: number) => string;
}

/**
 * Navigable cast timeline component
 * Displays spell sequences for events with previous/next navigation
 * Perfect for showing what was cast during ability windows or buff periods
 *  */
export const CastTimeline = ({
  events,
  windowDescription,
  title,
  formatTimestamp,
}: CastTimelineProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!events || events.length === 0) {
    return <div>No casts to display</div>;
  }

  const currentEvent = events[currentIndex];
  const spells = currentEvent.casts
    .filter((cast) => cast.ability && cast.ability.guid)
    .map((cast) => ({
      id: cast.ability.guid,
      name: cast.ability.name,
      icon: cast.ability.abilityIcon.replace('.jpg', ''),
    }));

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : events.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < events.length - 1 ? prev + 1 : 0));
  };

  const timestampText = formatTimestamp ? ` @ ${formatTimestamp(currentEvent.timestamp)}` : '';

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
        Per-Cast Timeline
        {windowDescription && (
          <span
            style={{ fontSize: '12px', color: '#999', fontWeight: 'normal', marginLeft: '8px' }}
          >
            {windowDescription}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px',
          gap: '10px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
            {currentEvent.header}
            {timestampText}
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
            {currentIndex + 1} of {events.length}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handlePrevious}
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '14px',
            }}
            aria-label="Previous cast"
          >
            ← Prev
          </button>

          <button
            type="button"
            onClick={handleNext}
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '14px',
            }}
            aria-label="Next cast"
          >
            Next →
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <SpellSeq spells={spells} />
      </div>
    </div>
  );
};

/**
 * Helper function to create cast timeline events from raw event data
 * Automatically infers timestamps from common event fields if getEventTimestamp is not provided
 *  *  *
 * @param config Configuration for creating timeline events
 * @param config.events Array of raw events to convert
 * @param config.timelineEvents Function that returns cast events for each event
 * @param config.formatTimestamp Optional timestamp formatter function
 * @param config.getEventTimestamp Optional function to extract timestamp (auto-inferred if not provided)
 * @param config.getEventHeader Function to generate header for each event
 * @returns Array of CastTimelineEvent objects ready for display
 */
export function createCastTimelineEvents<T>(config: {
  events: T[];
  timelineEvents: (event: T) => CastEvent[];
  formatTimestamp?: (timestamp: number) => string;
  getEventTimestamp?: (event: T) => number;
  getEventHeader: (event: T, index: number) => ReactNode;
}): CastTimelineEvent[] {
  return config.events.map((event, index) => {
    let timestamp: number;
    if (config.getEventTimestamp) {
      timestamp = config.getEventTimestamp(event);
    } else {
      const eventRecord = event as Record<string, unknown>;
      const castRecord = eventRecord.cast as Record<string, unknown> | undefined;
      timestamp =
        (eventRecord.timestamp as number | undefined) ??
        (eventRecord.applied as number | undefined) ??
        (eventRecord.removed as number | undefined) ??
        (castRecord?.timestamp as number | undefined) ??
        0;
    }

    return {
      timestamp,
      casts: config.timelineEvents(event),
      header: config.getEventHeader(event, index),
    };
  });
}
