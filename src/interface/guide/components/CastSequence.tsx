import { useState } from 'react';
import type Spell from 'common/SPELLS/Spell';
import styled from '@emotion/styled';
import { Tooltip } from 'interface';
import { qualitativePerformanceToColor } from 'interface/guide';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

export interface CastInSequence {
  timestamp: number;
  spellId: number;
  spellName: string;
  icon: string;
  performance?: QualitativePerformance;
  tooltip?: React.ReactNode;
}

export interface CastSequenceEntry<T = unknown> {
  data: T;
  casts: CastInSequence[];
  start?: number;
  end?: number;
}

interface CastSequenceProps<T = unknown> {
  spell: Spell;
  sequences: CastSequenceEntry<T>[];
  windowDescription?: string;
  castTimestamp: (data: T) => string;
  iconSize?: number;
}

/**
 * Navigable cast sequence visualization showing spell icons in a filmstrip layout.
 * @param spell - The spell/ability being analyzed
 * @param sequences - Array of cast sequence entries containing cast data
 * @param windowDescription - Optional description of the time window (e.g., "3s window")
 * @param castTimestamp - Function to format timestamp from cast data
 * @param iconSize - Size in pixels for spell icons (default: 40)
 */
export default function CastSequence<T>({
  spell,
  sequences,
  windowDescription,
  castTimestamp,
  iconSize = 40,
}: CastSequenceProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!sequences || sequences.length === 0) {
    return <div>No cast sequences to display</div>;
  }

  const currentSequence = sequences[currentIndex];

  // Calculate window duration from start/end
  let windowStart = currentSequence.start;
  let windowEnd = currentSequence.end;

  if (windowStart === undefined || windowEnd === undefined) {
    // Fallback: calculate from casts
    if (currentSequence.casts.length > 0) {
      const timestamps = currentSequence.casts.map((c) => c.timestamp);
      windowStart = Math.min(...timestamps);
      windowEnd = Math.max(...timestamps);
    }
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sequences.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < sequences.length - 1 ? prev + 1 : 0));
  };

  return (
    <Container>
      <TopSection>
        <LeftColumn>
          <HeaderTitle>{spell.name} Cast Sequences</HeaderTitle>
          <SequenceLabel>Cast Sequence</SequenceLabel>
        </LeftColumn>
        <NavigationButtons>
          <NavButton type="button" onClick={handlePrevious} aria-label="Previous sequence">
            ‹
          </NavButton>
          <SequenceInfo>
            {currentIndex + 1} / {sequences.length}
          </SequenceInfo>
          <NavButton type="button" onClick={handleNext} aria-label="Next sequence">
            ›
          </NavButton>
        </NavigationButtons>
      </TopSection>

      <FilmStripContainer>
        <FilmStrip>
          {currentSequence.casts.map((cast, castIdx) => {
            const color = cast.performance
              ? qualitativePerformanceToColor(cast.performance)
              : 'rgba(255, 255, 255, 0.3)';

            const relativeTime =
              windowStart !== undefined
                ? ((cast.timestamp - windowStart) / 1000).toFixed(2)
                : '0.00';

            const defaultTooltip = (
              <div>
                <strong>{cast.spellName}</strong>
                <br />
                <small>
                  Cast at {relativeTime}s
                  {cast.performance && (
                    <>
                      <br />
                      Performance: {cast.performance}
                    </>
                  )}
                </small>
              </div>
            );

            return (
              <Tooltip key={castIdx} content={cast.tooltip || defaultTooltip}>
                <SpellIcon size={iconSize} color={color}>
                  <img
                    src={`https://wow.zamimg.com/images/wow/icons/large/${cast.icon}.jpg`}
                    alt={cast.spellName}
                  />
                </SpellIcon>
              </Tooltip>
            );
          })}
        </FilmStrip>
      </FilmStripContainer>
    </Container>
  );
}

const Container = styled.div`
  margin-bottom: 16px;
`;

const TopSection = styled.div`
  display: flex;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 8px;
`;

const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: space-between;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fab700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const SequenceLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const NavigationButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const NavButton = styled.button`
  width: 32px;
  height: 32px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #fab700;
  font-size: 20px;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;

  &:hover {
    background: rgba(250, 183, 0, 0.2);
    border-color: #fab700;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const SequenceInfo = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  min-width: 50px;
  text-align: center;
`;

const FilmStripContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  overflow-x: auto;
  overflow-y: hidden;

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

const FilmStrip = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
`;

const SpellIcon = styled.div<{ size: number; color: string }>`
  position: relative;
  flex-shrink: 0;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border: 3px solid ${(props) => props.color};
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    z-index: 10;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;
