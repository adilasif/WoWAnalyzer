import styled from '@emotion/styled';
import { Tooltip } from 'interface';
import { qualitativePerformanceToColor } from 'interface/guide';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { useState, useMemo } from 'react';

export interface PerCastStat {
  value: string;
  label: string;
  tooltip: React.ReactNode;
  performance?: QualitativePerformance;
}

export interface PerCastData {
  performance: QualitativePerformance;
  stats: PerCastStat[];
  tooltip?: React.ReactNode;
  timestamp: string;
}

interface CastDetailProps {
  title: string;
  casts: PerCastData[];
  fontSize?: string;
}

/**
 * Displays per-cast statistics in a grid with performance-based colored boxes.
 * Each box represents one cast with its stats and overall performance.
 * Includes navigation controls and performance filtering.
 */
export default function CastDetail({ title, casts, fontSize = '16px' }: CastDetailProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [performanceFilter, setPerformanceFilter] = useState<Set<QualitativePerformance>>(
    () =>
      new Set([
        QualitativePerformance.Perfect,
        QualitativePerformance.Good,
        QualitativePerformance.Ok,
        QualitativePerformance.Fail,
      ]),
  );

  // Filter casts based on performance
  const filteredCasts = useMemo(() => {
    return casts.filter((cast) => performanceFilter.has(cast.performance));
  }, [casts, performanceFilter]);

  // Calculate overall performance summary
  const performanceCounts = {
    [QualitativePerformance.Perfect]: 0,
    [QualitativePerformance.Good]: 0,
    [QualitativePerformance.Ok]: 0,
    [QualitativePerformance.Fail]: 0,
  };

  casts.forEach((cast) => {
    performanceCounts[cast.performance]++;
  });

  const totalCasts = casts.length;
  const filteredCount = filteredCasts.length;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredCasts.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < filteredCasts.length - 1 ? prev + 1 : 0));
  };

  const togglePerformanceFilter = (performance: QualitativePerformance) => {
    setPerformanceFilter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(performance)) {
        newSet.delete(performance);
      } else {
        newSet.add(performance);
      }
      // Reset index if current cast is filtered out
      if (currentIndex >= filteredCasts.length) {
        setCurrentIndex(0);
      }
      return newSet;
    });
  };

  // Ensure current index is valid
  const validIndex = Math.min(currentIndex, filteredCount - 1);
  const currentCast = filteredCount > 0 ? filteredCasts[validIndex] : null;
  const currentCastColor = currentCast
    ? qualitativePerformanceToColor(currentCast.performance)
    : 'rgba(255, 255, 255, 0.3)';

  return (
    <Container>
      <TopSection>
        <LeftColumn>
          <HeaderTitle>{title}</HeaderTitle>
        </LeftColumn>
        <StatsColumn>
          {performanceCounts[QualitativePerformance.Perfect] > 0 && (
            <Tooltip
              content={`Perfect casts - ${performanceCounts[QualitativePerformance.Perfect]} / ${totalCasts}`}
            >
              <FilterStatCard
                color={qualitativePerformanceToColor(QualitativePerformance.Perfect)}
                active={performanceFilter.has(QualitativePerformance.Perfect)}
                onClick={() => togglePerformanceFilter(QualitativePerformance.Perfect)}
              >
                <StatValue>{performanceCounts[QualitativePerformance.Perfect]}</StatValue>
                <StatLabel>Perfect</StatLabel>
              </FilterStatCard>
            </Tooltip>
          )}
          {performanceCounts[QualitativePerformance.Good] > 0 && (
            <Tooltip
              content={`Good casts - ${performanceCounts[QualitativePerformance.Good]} / ${totalCasts}`}
            >
              <FilterStatCard
                color={qualitativePerformanceToColor(QualitativePerformance.Good)}
                active={performanceFilter.has(QualitativePerformance.Good)}
                onClick={() => togglePerformanceFilter(QualitativePerformance.Good)}
              >
                <StatValue>{performanceCounts[QualitativePerformance.Good]}</StatValue>
                <StatLabel>Good</StatLabel>
              </FilterStatCard>
            </Tooltip>
          )}
          {performanceCounts[QualitativePerformance.Ok] > 0 && (
            <Tooltip
              content={`Ok casts - ${performanceCounts[QualitativePerformance.Ok]} / ${totalCasts}`}
            >
              <FilterStatCard
                color={qualitativePerformanceToColor(QualitativePerformance.Ok)}
                active={performanceFilter.has(QualitativePerformance.Ok)}
                onClick={() => togglePerformanceFilter(QualitativePerformance.Ok)}
              >
                <StatValue>{performanceCounts[QualitativePerformance.Ok]}</StatValue>
                <StatLabel>Ok</StatLabel>
              </FilterStatCard>
            </Tooltip>
          )}
          {performanceCounts[QualitativePerformance.Fail] > 0 && (
            <Tooltip
              content={`Failed casts - ${performanceCounts[QualitativePerformance.Fail]} / ${totalCasts}`}
            >
              <FilterStatCard
                color={qualitativePerformanceToColor(QualitativePerformance.Fail)}
                active={performanceFilter.has(QualitativePerformance.Fail)}
                onClick={() => togglePerformanceFilter(QualitativePerformance.Fail)}
              >
                <StatValue>{performanceCounts[QualitativePerformance.Fail]}</StatValue>
                <StatLabel>Bad</StatLabel>
              </FilterStatCard>
            </Tooltip>
          )}
        </StatsColumn>
      </TopSection>
      <HelperTextRow>
        <PerformanceLabel>Cast Details</PerformanceLabel>
        <HelperText>Click performance boxes to filter casts</HelperText>
      </HelperTextRow>

      {filteredCount === 0 ? (
        <NoResultsMessage>
          <NoResultsTitle>No casts match the current filter</NoResultsTitle>
          <NoResultsHint>Click the performance boxes above to toggle filters</NoResultsHint>
        </NoResultsMessage>
      ) : (
        <PerformanceContainer color={currentCastColor}>
          <CastHeader>
            <CastInfo>
              <CastTitle>
                Cast #{casts.indexOf(currentCast!) + 1} ({currentCast!.timestamp}) -{' '}
                {currentCast!.performance}
              </CastTitle>
            </CastInfo>
            <NavigationButtons>
              <NavButton onClick={handlePrevious} disabled={filteredCount <= 1}>
                ‹
              </NavButton>
              <CastCounter>
                {validIndex + 1} / {filteredCount}
              </CastCounter>
              <NavButton onClick={handleNext} disabled={filteredCount <= 1}>
                ›
              </NavButton>
            </NavigationButtons>
          </CastHeader>

          <StatsGrid>
            {currentCast!.stats.map((stat, statIdx) => {
              const borderColor = stat.performance
                ? qualitativePerformanceToColor(stat.performance)
                : 'rgba(255, 255, 255, 0.3)';
              return (
                <Tooltip key={statIdx} content={stat.tooltip}>
                  <StatItem borderColor={borderColor}>
                    <StatItemValue fontSize={fontSize}>{stat.value}</StatItemValue>
                    <StatItemLabel>{stat.label}</StatItemLabel>
                  </StatItem>
                </Tooltip>
              );
            })}
          </StatsGrid>
        </PerformanceContainer>
      )}
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

const PerformanceLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const HelperText = styled.div`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
`;

const HelperTextRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 16px;
`;

const StatsColumn = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const FilterStatCard = styled.div<{ color: string; active: boolean }>`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
  min-width: 70px;
  border-left: 3px solid ${(props) => props.color};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
  cursor: pointer;
  opacity: ${(props) => (props.active ? 1 : 0.4)};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    opacity: 1;
  }

  &:active {
    transform: translateY(0);
  }
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  margin-bottom: 2px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
`;

const StatLabel = styled.div`
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NavigationButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const NavButton = styled.button<{ disabled?: boolean }>`
  width: 32px;
  height: 32px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: ${(props) => (props.disabled ? '#666' : '#fab700')};
  font-size: 20px;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  opacity: ${(props) => (props.disabled ? 0.4 : 1)};

  &:hover:not(:disabled) {
    background: rgba(250, 183, 0, 0.2);
    border-color: #fab700;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

const CastCounter = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  min-width: 50px;
  text-align: center;
`;

const PerformanceContainer = styled.div<{ color: string }>`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 12px;
  border-left: 4px solid ${(props) => props.color};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const NoResultsMessage = styled.div`
  padding: 30px 20px;
  text-align: center;
  color: #999;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  margin-top: 8px;
`;

const NoResultsTitle = styled.div`
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: bold;
`;

const NoResultsHint = styled.div`
  font-size: 12px;
`;

const CastHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const CastInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const CastTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #fab700;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 8px;
`;

const StatItem = styled.div<{ borderColor: string }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border-left: 3px solid ${(props) => props.borderColor};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const StatItemValue = styled.div<{ fontSize: string }>`
  font-size: ${(props) => props.fontSize};
  font-weight: 700;
  color: #fff;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  text-align: left;
  margin-bottom: 4px;
`;

const StatItemLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;
  margin-bottom: 4px;
`;
