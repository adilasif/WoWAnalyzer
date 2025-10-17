import { useState } from 'react';
import type Spell from 'common/SPELLS/Spell';
import { AnyEvent } from 'parser/core/Events';
import EmbeddedTimelineContainer, {
  SpellTimeline,
} from 'interface/report/Results/Timeline/EmbeddedTimeline';
import Casts from 'interface/report/Results/Timeline/Casts';
import styled from '@emotion/styled';

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
export default function CastTimeline<T>({
  spell,
  events,
  windowDescription,
  castTimestamp,
  secondWidth = 50,
}: CastTimelineProps<T>) {
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
}
