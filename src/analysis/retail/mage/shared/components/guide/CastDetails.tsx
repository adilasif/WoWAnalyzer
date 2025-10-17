import { ReactNode, useState } from 'react';
import { SpellIcon, TooltipElement } from 'interface';
import Spell from 'common/SPELLS/Spell';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { qualitativePerformanceToColor } from 'interface/guide';
import styled from '@emotion/styled';

const CastDetailsContainer = styled.div<{ performance: QualitativePerformance }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 4px solid ${(props) => qualitativePerformanceToColor(props.performance)};
  border-radius: 4px;
  margin-bottom: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
    transform: translateX(2px);
  }
`;

// Reusable flex containers
const FlexRow = styled.div<{ gap?: number; justify?: string }>`
  display: flex;
  align-items: center;
  gap: ${(props) => props.gap || 12}px;
  justify-content: ${(props) => props.justify || 'flex-start'};
`;

const FlexColumn = styled.div<{ gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.gap || 12}px;
`;

// Cast header components
const Header = FlexRow;
const SpellIconWrapper = styled.div`
  flex-shrink: 0;
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 4px;
`;

const SpellName = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: #fff;
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: #aaa;
`;

const PerformanceBadge = styled.div<{ performance: QualitativePerformance }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  background: ${(props) => qualitativePerformanceToColor(props.performance)};
  color: #000;
  text-transform: uppercase;
  white-space: nowrap;
  align-self: flex-start;
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const DetailItem = styled(FlexColumn)`
  gap: 4px;
`;

const DetailLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  color: #999;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.div<{ color?: string }>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) => props.color || '#fff'};
`;

const Notes = styled.div`
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #ddd;
`;

// Navigation & Control components (reusing FlexColumn and FlexRow)
const NavigationContainer = FlexColumn;

const ControlBar = styled(FlexColumn)`
  gap: 10px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
`;

const ControlRow = styled(FlexRow)`
  justify-content: space-between;
`;

const HeaderTitle = styled.h4`
  margin: 0;
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
`;

const NavigationControls = styled(FlexRow)`
  gap: 8px;
`;

const NavButton = styled.button<{ disabled?: boolean }>`
  padding: 4px 12px;
  background: ${(props) => (props.disabled ? 'rgba(255, 255, 255, 0.1)' : '#fab700')};
  color: ${(props) => (props.disabled ? '#666' : '#000')};
  border: none;
  border-radius: 3px;
  font-weight: bold;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  font-size: 12px;

  &:hover:not(:disabled) {
    background: #ffc929;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const CastCounter = styled.div`
  font-size: 12px;
  color: #fff;
  font-weight: bold;
  min-width: 80px;
  text-align: center;
`;

// View Toggle & Filters (reusing FlexRow)
const FilterToggle = styled(FlexRow)`
  gap: 6px;
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  color: #fff;
  font-size: 12px;
`;

const ToggleSwitch = styled.input`
  width: 36px;
  height: 20px;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.3s ease;

  &:checked {
    background: #ff0000;
  }

  &:before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    background: white;
    transition: transform 0.3s ease;
  }

  &:checked:before {
    transform: translateX(16px);
  }
`;

// Performance Filters (reusing FlexRow)
const PerformanceFilter = styled(FlexRow)`
  gap: 6px;
`;

const FilterButton = styled.button<{ active: boolean; color: string }>`
  padding: 4px 10px;
  background: ${(props) => (props.active ? props.color : 'rgba(255, 255, 255, 0.1)')};
  color: ${(props) => (props.active ? '#000' : '#999')};
  border: 1px solid ${(props) => (props.active ? props.color : 'rgba(255, 255, 255, 0.2)')};
  border-radius: 3px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 11px;
  text-transform: uppercase;

  &:hover {
    border-color: ${(props) => props.color};
    color: ${(props) => (props.active ? '#000' : '#fff')};
  }
`;

// Empty State
const NoResultsMessage = styled.div`
  padding: 30px 20px;
  text-align: center;
  color: #999;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
`;

const NoResultsTitle = styled.div`
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: bold;
`;

const NoResultsHint = styled.div`
  font-size: 12px;
  color: #666;
`;

export interface CastDetail {
  label: string;
  value: string | number | ReactNode;
  performance?: QualitativePerformance;
  tooltip?: ReactNode;
}

export interface CastEntry {
  /** The spell that was cast */
  spell: Spell;
  /** The timestamp of the cast */
  timestamp: number;
  /** Overall performance of the cast */
  performance: QualitativePerformance;
  /** Array of detail items to display */
  details?: CastDetail[];
  /** Optional notes or additional information */
  notes?: ReactNode;
  /** Optional custom header content */
  headerContent?: ReactNode;
}

export interface CastDetailsProps {
  /** Array of cast entries - can be single or multiple */
  casts: CastEntry[];
  /** Function to format timestamps */
  formatTimestamp: (timestamp: number) => string;
  /** Optional title for the section */
  title?: string;
  /** Show view mode toggle (single vs list) - default true */
  showViewToggle?: boolean;
  /** Show performance filter - default true */
  showPerformanceFilter?: boolean;
  /** Default to showing only failures - default false */
  defaultShowFailuresOnly?: boolean;
}

/**
 * Helper function to convert performance to color.
 * Centralizes color mapping so guides don't need to know about colors.
 */
function getPerformanceColor(performance?: QualitativePerformance): string {
  if (!performance) return '#ffffff';

  switch (performance) {
    case QualitativePerformance.Perfect:
      return '#1eff00';
    case QualitativePerformance.Good:
      return '#fab700';
    case QualitativePerformance.Ok:
      return '#ff8800';
    case QualitativePerformance.Fail:
      return '#ff0000';
    default:
      return '#ffffff';
  }
}

/**
 * Displays detailed cast information with navigation and filtering controls.
 * Always navigable - can step through casts one at a time or view all.
 */
export default function CastDetails({
  casts,
  formatTimestamp,
  title,
  showViewToggle = true,
  showPerformanceFilter = true,
  defaultShowFailuresOnly = false,
}: CastDetailsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllCasts, setShowAllCasts] = useState(false);
  const [filterPerformance, setFilterPerformance] = useState<Set<QualitativePerformance>>(
    () => new Set(defaultShowFailuresOnly ? [QualitativePerformance.Fail] : []),
  );

  if (!casts || casts.length === 0) {
    return <div style={{ color: '#999' }}>No casts to display</div>;
  }

  // Apply performance filter
  const filteredCasts =
    filterPerformance.size === 0
      ? casts
      : casts.filter((cast) => filterPerformance.has(cast.performance));

  // Ensure currentIndex is valid after filtering
  const validIndex =
    filteredCasts.length > 0 ? Math.min(currentIndex, filteredCasts.length - 1) : 0;
  const currentCast = filteredCasts.length > 0 ? filteredCasts[validIndex] : null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredCasts.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < filteredCasts.length - 1 ? prev + 1 : 0));
  };

  const togglePerformanceFilter = (perf: QualitativePerformance) => {
    setFilterPerformance((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(perf)) {
        newSet.delete(perf);
      } else {
        newSet.add(perf);
      }
      return newSet;
    });
    setCurrentIndex(0);
  };

  const performanceColors = {
    [QualitativePerformance.Perfect]: '#1eff00',
    [QualitativePerformance.Good]: '#fab700',
    [QualitativePerformance.Ok]: '#ff8800',
    [QualitativePerformance.Fail]: '#ff0000',
  };

  const performanceLabels = {
    [QualitativePerformance.Perfect]: 'Perfect',
    [QualitativePerformance.Good]: 'Good',
    [QualitativePerformance.Ok]: 'OK',
    [QualitativePerformance.Fail]: 'Failed',
  };

  const renderCast = (cast: CastEntry) => {
    const performanceLabel = performanceLabels[cast.performance];

    return (
      <CastDetailsContainer performance={cast.performance}>
        <Header>
          <SpellIconWrapper>
            <SpellIcon spell={cast.spell} style={{ width: '48px', height: '48px' }} />
          </SpellIconWrapper>
          <HeaderInfo>
            <SpellName>{cast.spell.name}</SpellName>
            <Timestamp>{formatTimestamp(cast.timestamp)}</Timestamp>
            {cast.headerContent}
          </HeaderInfo>
          <PerformanceBadge performance={cast.performance}>{performanceLabel}</PerformanceBadge>
        </Header>

        {cast.details && cast.details.length > 0 && (
          <DetailsGrid>
            {cast.details.map((detail, index) => {
              const content = (
                <DetailItem key={index}>
                  <DetailLabel>{detail.label}</DetailLabel>
                  <DetailValue color={getPerformanceColor(detail.performance)}>
                    {detail.value}
                  </DetailValue>
                </DetailItem>
              );

              return detail.tooltip ? (
                <TooltipElement key={index} content={detail.tooltip}>
                  {content}
                </TooltipElement>
              ) : (
                content
              );
            })}
          </DetailsGrid>
        )}

        {cast.notes && <Notes>{cast.notes}</Notes>}
      </CastDetailsContainer>
    );
  };

  return (
    <NavigationContainer>
      <ControlBar>
        {/* Top Row: Header (left) and Navigation (right) */}
        <ControlRow>
          {title && <HeaderTitle>{title}</HeaderTitle>}
          {!showAllCasts && (
            <NavigationControls>
              <NavButton onClick={handlePrevious} disabled={filteredCasts.length <= 1}>
                ← Previous
              </NavButton>
              <CastCounter>
                Cast {validIndex + 1} of {filteredCasts.length}
              </CastCounter>
              <NavButton onClick={handleNext} disabled={filteredCasts.length <= 1}>
                Next →
              </NavButton>
            </NavigationControls>
          )}
        </ControlRow>

        {/* Bottom Row: View Toggle (left) and Performance Filters (right) */}
        <ControlRow>
          {showViewToggle && (
            <FilterToggle>
              <ToggleLabel>
                <span>{showAllCasts ? 'List View' : 'Single View'}</span>
                <ToggleSwitch
                  type="checkbox"
                  checked={showAllCasts}
                  onChange={(e) => {
                    setShowAllCasts(e.target.checked);
                    setCurrentIndex(0);
                  }}
                />
              </ToggleLabel>
            </FilterToggle>
          )}

          {showPerformanceFilter && (
            <PerformanceFilter>
              <span style={{ color: '#888', fontSize: '11px', fontWeight: '500' }}>Show:</span>
              {[
                QualitativePerformance.Perfect,
                QualitativePerformance.Good,
                QualitativePerformance.Ok,
                QualitativePerformance.Fail,
              ].map((perfValue) => {
                const label = performanceLabels[perfValue];
                const isActive = filterPerformance.size === 0 || filterPerformance.has(perfValue);
                return (
                  <FilterButton
                    key={perfValue}
                    active={isActive}
                    color={performanceColors[perfValue]}
                    onClick={() => togglePerformanceFilter(perfValue)}
                  >
                    {label}
                  </FilterButton>
                );
              })}
            </PerformanceFilter>
          )}
        </ControlRow>
      </ControlBar>

      {filteredCasts.length === 0 ? (
        <NoResultsMessage>
          <NoResultsTitle>📭 No casts match the selected filter</NoResultsTitle>
          <NoResultsHint>Try selecting different performance levels above</NoResultsHint>
        </NoResultsMessage>
      ) : showAllCasts ? (
        <div>
          {filteredCasts.map((cast, index) => (
            <div key={index}>{renderCast(cast)}</div>
          ))}
        </div>
      ) : (
        currentCast && renderCast(currentCast)
      )}
    </NavigationContainer>
  );
}
