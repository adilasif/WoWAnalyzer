import { ReactNode, useState } from 'react';
import { SpellIcon, TooltipElement } from 'interface';
import Spell from 'common/SPELLS/Spell';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { qualitativePerformanceToColor } from 'interface/guide';
import { PerformanceBoxRow, BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import styled from '@emotion/styled';
import GuideTooltip from './GuideTooltip';

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
  gap: ${(props) => props.gap || 16}px;
`;

// Reusable grid layout
const ResponsiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const OverviewContainer = FlexColumn;

// Summary Card
const SummaryCard = styled.div`
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px 8px 0 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: none;
`;

const SummaryHeader = FlexRow;

const SummaryTitle = styled.h3`
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
`;

const SummaryStats = ResponsiveGrid;

const DetailColumn = styled(FlexColumn)`
  gap: 4px;
`;

const DetailLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  color: #999;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.div<{ color?: string }>`
  font-size: 20px;
  font-weight: bold;
  color: ${(props) => props.color || '#fff'};
`;

// Aliases for summary stats (same styling as cast details)
const StatItem = DetailColumn;
const StatLabel = DetailLabel;
const StatValue = styled(DetailValue)`
  font-size: 24px;
`;

// Performance Boxes Container - attaches to bottom of summary card
const PerformanceBoxesContainer = styled.div`
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0 0 8px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

// Cast Details Panel
const CastDetailsPanel = styled.div`
  padding: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

const CastHeader = styled(FlexRow)`
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const CastTitle = FlexRow;

const CastNumber = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: #fff;
`;

const CastTimestamp = styled.div`
  font-size: 13px;
  color: #aaa;
`;

const PerformanceBadge = styled.div<{ performance: QualitativePerformance }>`
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  background: ${(props) => qualitativePerformanceToColor(props.performance)};
  color: #000;
  text-transform: uppercase;
`;

const CastDetailsGrid = ResponsiveGrid;

const CastDetailItem = styled(DetailColumn)`
  gap: 6px;
`;

const CastDetailLabel = DetailLabel;
const CastDetailValue = DetailValue;

const CastNotes = styled.div`
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #ddd;
`;

const CloseButton = styled.button`
  margin-top: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

export interface CastOverviewDetail {
  label: string;
  value: string | number | ReactNode;
  performance?: QualitativePerformance;
  tooltip?: ReactNode;
}

export interface CastOverviewEntry {
  timestamp: number;
  performance: QualitativePerformance;
  details: CastOverviewDetail[];
  notes?: ReactNode;
}

export interface OverviewStat {
  label: string;
  value: string | number | ReactNode;
  performance?: QualitativePerformance;
  tooltip?: ReactNode;
}

export interface CastOverviewProps {
  spell: Spell;
  stats: OverviewStat[];
  casts: CastOverviewEntry[];
  formatTimestamp: (timestamp: number) => string;
  title?: string;
}

const performanceLabels = {
  [QualitativePerformance.Perfect]: 'Perfect',
  [QualitativePerformance.Good]: 'Good',
  [QualitativePerformance.Ok]: 'OK',
  [QualitativePerformance.Fail]: 'Failed',
};

/**
 * Displays overview statistics and clickable performance boxes for individual casts.
 * @param spell - The spell being analyzed
 * @param stats - Overall statistics to display in summary card
 * @param casts - Individual cast entries with performance and details
 * @param formatTimestamp - Function to format timestamps
 * @param title - Optional title override (default: spell name)
 */
export default function CastOverview({
  spell,
  stats,
  casts,
  formatTimestamp,
  title,
}: CastOverviewProps) {
  const [selectedCastIndex, setSelectedCastIndex] = useState<number | null>(null);

  if (!casts || casts.length === 0) {
    return <div style={{ color: '#999' }}>No casts to display</div>;
  }

  const selectedCast = selectedCastIndex !== null ? casts[selectedCastIndex] : null;

  // Convert casts to BoxRowEntry format for PerformanceBoxRow
  const boxRowEntries: BoxRowEntry[] = casts.map((cast, index) => ({
    value: cast.performance,
    tooltip: (
      <GuideTooltip
        formatTimestamp={formatTimestamp}
        performance={cast.performance}
        tooltipItems={[{ perf: cast.performance, detail: `Cast #${index + 1}` }]}
        timestamp={cast.timestamp}
      />
    ),
    className: selectedCastIndex === index ? 'selected' : undefined,
  }));

  const handleBoxClick = (index: number) => {
    setSelectedCastIndex(selectedCastIndex === index ? null : index);
  };

  return (
    <OverviewContainer>
      <SummaryCard>
        <SummaryHeader style={{ marginBottom: '20px' }}>
          <SpellIcon spell={spell} style={{ width: '40px', height: '40px' }} />
          <SummaryTitle>{title || `${spell.name} Overview`}</SummaryTitle>
        </SummaryHeader>
        <SummaryStats>
          {stats.map((stat, index) => {
            const content = (
              <StatItem key={index}>
                <StatLabel>{stat.label}</StatLabel>
                <StatValue
                  color={
                    stat.performance ? qualitativePerformanceToColor(stat.performance) : undefined
                  }
                >
                  {stat.value}
                </StatValue>
              </StatItem>
            );

            return stat.tooltip ? (
              <TooltipElement key={index} content={stat.tooltip}>
                {content}
              </TooltipElement>
            ) : (
              content
            );
          })}
        </SummaryStats>
      </SummaryCard>

      <PerformanceBoxesContainer>
        <PerformanceBoxRow values={boxRowEntries} onClickBox={handleBoxClick} />
      </PerformanceBoxesContainer>

      {selectedCast && selectedCastIndex !== null && (
        <CastDetailsPanel>
          <CastHeader>
            <CastTitle>
              <CastNumber>Cast #{selectedCastIndex + 1}</CastNumber>
              <CastTimestamp>{formatTimestamp(selectedCast.timestamp)}</CastTimestamp>
            </CastTitle>
            <PerformanceBadge performance={selectedCast.performance}>
              {performanceLabels[selectedCast.performance]}
            </PerformanceBadge>
          </CastHeader>

          <CastDetailsGrid>
            {selectedCast.details.map((detail, index) => {
              const content = (
                <CastDetailItem key={index}>
                  <CastDetailLabel>{detail.label}</CastDetailLabel>
                  <CastDetailValue
                    color={
                      detail.performance
                        ? qualitativePerformanceToColor(detail.performance)
                        : undefined
                    }
                  >
                    {detail.value}
                  </CastDetailValue>
                </CastDetailItem>
              );

              return detail.tooltip ? (
                <TooltipElement key={index} content={detail.tooltip}>
                  {content}
                </TooltipElement>
              ) : (
                content
              );
            })}
          </CastDetailsGrid>

          {selectedCast.notes && <CastNotes>{selectedCast.notes}</CastNotes>}

          <CloseButton onClick={() => setSelectedCastIndex(null)}>Close Details</CloseButton>
        </CastDetailsPanel>
      )}
    </OverviewContainer>
  );
}
