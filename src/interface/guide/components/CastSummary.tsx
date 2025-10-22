import Spell from 'common/SPELLS/Spell';
import styled from '@emotion/styled';
import { formatDuration } from 'common/format';
import { Tooltip, ControlledExpandable } from 'interface';
import { useFight } from 'interface/report/context/FightContext';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { useState } from 'react';
import GradiatedPerformanceBar from './GradiatedPerformanceBar';
import GuideTooltip from './GuideTooltip';
import { BoxRowEntry, PerformanceBoxRow } from './PerformanceBoxRow';

export interface CastEvaluation {
  timestamp: number;
  performance: QualitativePerformance;
  reason: string;
}

interface CastSummaryProps {
  spell: Spell;
  casts: CastEvaluation[];
  showBreakdown?: boolean;
}

/**
 * Displays cast performance summary bar and optionally detailed per-cast breakdown.
 * Shows a "no casts" message if the casts array is empty.
 * @param spell - The spell being analyzed
 * @param casts - Array of cast evaluations with timestamps and performance ratings
 * @param showBreakdown - Whether to show expandable per-cast breakdown (default: false)
 */
export default function CastSummary({
  spell,
  casts,
  showBreakdown = false,
}: CastSummaryProps): JSX.Element {
  const { fight } = useFight();
  const formatTimestamp = (timestamp: number) => formatDuration(timestamp - fight.start_time);
  const [isExpanded, setIsExpanded] = useState(false);

  // Show "no casts" message if there are no casts
  if (!casts || casts.length === 0) {
    return (
      <div>
        <strong>No {spell.name} casts recorded.</strong>
        <br />
        <small>
          Make sure you are using this spell if it is available to you and you are specced into it.
        </small>
      </div>
    );
  }

  // Calculate performance counts
  const perfect = casts.filter((c) => c.performance === QualitativePerformance.Perfect).length;
  const good = casts.filter((c) => c.performance === QualitativePerformance.Good).length;
  const ok = casts.filter((c) => c.performance === QualitativePerformance.Ok).length;
  const bad = casts.filter((c) => c.performance === QualitativePerformance.Fail).length;
  const total = casts.length;

  // Convert to BoxRowEntry format for breakdown
  const castEntries: BoxRowEntry[] = showBreakdown
    ? casts.map((cast) => ({
        value: cast.performance,
        tooltip: (
          <GuideTooltip
            formatTimestamp={formatTimestamp}
            performance={cast.performance}
            tooltipItems={[{ perf: cast.performance, detail: cast.reason }]}
            timestamp={cast.timestamp}
          />
        ),
      }))
    : [];

  return (
    <Container>
      <TopSection>
        <LeftColumn>
          <HeaderTitle>{spell.name} Casts</HeaderTitle>
          <PerformanceLabel>Performance</PerformanceLabel>
        </LeftColumn>
        <StatsColumn>
          {perfect > 0 && (
            <Tooltip content={`Perfect casts - ${perfect} / ${total}`}>
              <StatCard color="#4ec9a2">
                <StatValue>{perfect}</StatValue>
                <StatLabel>Perfect</StatLabel>
              </StatCard>
            </Tooltip>
          )}
          {good > 0 && (
            <Tooltip content={`Good casts - ${good} / ${total}`}>
              <StatCard color="#9ece6a">
                <StatValue>{good}</StatValue>
                <StatLabel>Good</StatLabel>
              </StatCard>
            </Tooltip>
          )}
          {ok > 0 && (
            <Tooltip content={`Ok casts - ${ok} / ${total}`}>
              <StatCard color="#cc7a00">
                <StatValue>{ok}</StatValue>
                <StatLabel>Ok</StatLabel>
              </StatCard>
            </Tooltip>
          )}
          {bad > 0 && (
            <Tooltip content={`Bad casts - ${bad} / ${total}`}>
              <StatCard color="#cd1b1b">
                <StatValue>{bad}</StatValue>
                <StatLabel>Bad</StatLabel>
              </StatCard>
            </Tooltip>
          )}
        </StatsColumn>
      </TopSection>

      {showBreakdown ? (
        <>
          <ControlledExpandable
            header={
              <BarContainer>
                <GradiatedPerformanceBar
                  perfect={{ count: perfect, label: 'Perfect casts' }}
                  good={{ count: good, label: 'Good casts' }}
                  ok={{ count: ok, label: 'Ok casts' }}
                  bad={{ count: bad, label: 'Bad casts' }}
                />
              </BarContainer>
            }
            element="section"
            expanded={isExpanded}
            inverseExpanded={() => setIsExpanded(!isExpanded)}
          >
            <BreakdownContainer>
              <HelperText>Hover over the boxes below for more details</HelperText>
              <PerformanceBoxRow values={castEntries} />
            </BreakdownContainer>
          </ControlledExpandable>
          {!isExpanded && <HelperText>Click the bar above for per-cast breakdown</HelperText>}
        </>
      ) : (
        <BarContainer>
          <GradiatedPerformanceBar
            perfect={{ count: perfect, label: 'Perfect casts' }}
            good={{ count: good, label: 'Good casts' }}
            ok={{ count: ok, label: 'Ok casts' }}
            bad={{ count: bad, label: 'Bad casts' }}
          />
        </BarContainer>
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

const StatsColumn = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const StatCard = styled.div<{ color: string }>`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
  min-width: 70px;
  border-left: 3px solid ${(props) => props.color};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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

const HelperText = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 6px;
  font-style: italic;
`;

const BarContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 4px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);

  .gradiated-bar-container {
    display: flex;
  }

  .gradiated-bar-container > div {
    height: 24px !important;
    display: block !important;
  }
`;

const BreakdownContainer = styled.div`
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
`;
