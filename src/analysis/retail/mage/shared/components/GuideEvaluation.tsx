import { useState } from 'react';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { AnyEvent } from 'parser/core/Events';
import type Spell from 'common/SPELLS/Spell';
import GuideTooltip from './guide/GuideTooltip';
import type { ExpandableConfig, ExpandableChecklistItem } from './guide/ExpandableBreakdown';
import EmbeddedTimelineContainer, {
  SpellTimeline,
} from 'interface/report/Results/Timeline/EmbeddedTimeline';
import Casts from 'interface/report/Results/Timeline/Casts';
import styled from '@emotion/styled';

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

/**
 * Timeline entry for CastTimeline component.
 * Contains data, events, and optional explicit window boundaries.
 */
export interface CastTimelineEntry<T = unknown> {
  /** Source data for this timeline entry */
  data: T;
  /** All timeline events (Cast, BeginChannel, EndChannel, GlobalCooldown, etc.) */
  casts: AnyEvent[];
  /** Optional window start timestamp (ms). If not provided, calculated from events. */
  start?: number;
  /** Optional window end timestamp (ms). If not provided, calculated from events. */
  end?: number;
}

const TimelineScrollContainer = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;

  &::-webkit-scrollbar {
    height: 12px;
    cursor: default !important;
  }

  &::-webkit-scrollbar-track {
    background: rgba(104, 103, 100, 0.15);
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: #fab700;
  }
`;

interface CastTimelineProps<T = unknown> {
  spell: Spell;
  events: CastTimelineEntry<T>[];
  windowDescription?: string;
  castTimestamp: (data: T) => string;
  secondWidth?: number;
}

/**
 * Navigable cast timeline component with previous/next navigation.
 * Uses the Timeline tab visualization for temporal representation with horizontal bars.
 * Includes custom styled scrollbar matching the main Timeline tab.
 */
export const CastTimeline = <T,>({
  spell,
  events,
  windowDescription,
  castTimestamp,
  secondWidth = 50,
}: CastTimelineProps<T>) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!events || events.length === 0) {
    return <div>No casts to display</div>;
  }

  const currentEvent = events[currentIndex];
  const timestamp = castTimestamp(currentEvent.data);

  // Calculate window duration from start/end, or fall back to earliest/latest event
  let windowStart = currentEvent.start;
  let windowEnd = currentEvent.end;

  if (windowStart === undefined || windowEnd === undefined) {
    // Fallback: calculate from events
    const timestamps = currentEvent.casts.map((e) => e.timestamp);
    windowStart = Math.min(...timestamps);
    windowEnd = Math.max(...timestamps);
  }

  const duration = (windowEnd - windowStart) / 1000; // Convert to seconds

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : events.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < events.length - 1 ? prev + 1 : 0));
  };

  const timestampText = ` @ ${timestamp}`;

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
            {spell.name} #{currentIndex + 1}
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

      <TimelineScrollContainer>
        <EmbeddedTimelineContainer secondWidth={secondWidth} secondsShown={duration}>
          <SpellTimeline>
            <Casts start={windowStart} secondWidth={secondWidth} events={currentEvent.casts} />
          </SpellTimeline>
        </EmbeddedTimelineContainer>
      </TimelineScrollContainer>
    </div>
  );
};
