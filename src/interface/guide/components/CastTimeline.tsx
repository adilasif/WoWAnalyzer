import { ReactNode, useState } from 'react';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { PerformanceMark } from 'interface/guide';
import { SpellSeq } from 'parser/ui/SpellSeq';
import { CastEvent } from 'parser/core/Events';

interface CastTimelineEvent {
  timestamp: number;
  casts: CastEvent[];
  header: ReactNode;
  performance?: QualitativePerformance;
}

interface Props {
  events: CastTimelineEvent[];
  windowDescription?: string;
}

/**
 * Compact cast timeline navigator with arrow buttons to flip through events.
 * Perfect for showing cast sequences without taking up too much vertical space.
 */
const CastTimeline = ({ events, windowDescription }: Props) => {
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

  return (
    <div style={{ marginTop: '10px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          gap: '10px',
        }}
      >
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

        <div style={{ flex: 1, textAlign: 'center' }}>
          {currentEvent.performance !== undefined && (
            <PerformanceMark perf={currentEvent.performance} />
          )}{' '}
          <strong>{currentEvent.header}</strong>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
            {currentIndex + 1} of {events.length}
          </div>
        </div>

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

      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>
          {windowDescription || 'Casts during window'}:
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          <SpellSeq spells={spells} />
        </div>
      </div>
    </div>
  );
};

export default CastTimeline;
