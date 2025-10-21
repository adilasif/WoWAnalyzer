import { useState } from 'react';
import type Spell from 'common/SPELLS/Spell';
import { AnyEvent } from 'parser/core/Events';
import EmbeddedTimelineContainer, {
  SpellTimeline,
} from 'interface/report/Results/Timeline/EmbeddedTimeline';
import Casts from 'interface/report/Results/Timeline/Casts';
import styled from '@emotion/styled';

export interface CastTimelineEntry<T = unknown> {
  data: T;
  casts: AnyEvent[];
  start?: number;
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
 * Navigable cast timeline visualization with previous/next navigation.
 * @param spell - The spell being analyzed
 * @param events - Array of timeline entries containing cast data and events
 * @param windowDescription - Optional description of the time window (e.g., "3s window")
 * @param castTimestamp - Function to format timestamp from cast data
 * @param secondWidth - Width in pixels per second for timeline scaling (default: 50)
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
