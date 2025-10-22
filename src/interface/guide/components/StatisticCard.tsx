import styled from '@emotion/styled';
import { Tooltip } from 'interface';
import { qualitativePerformanceToColor } from 'interface/guide';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

export interface StatisticData {
  value: string;
  label: string;
  tooltip: React.ReactNode;
  performance?: QualitativePerformance;
}

interface StatisticCardProps {
  stats: StatisticData[];
  title?: string;
  fontSize?: string;
}

export default function StatisticCard({ stats, title, fontSize = '20px' }: StatisticCardProps) {
  return (
    <Container>
      {title && <CardHeader>{title}</CardHeader>}
      <StatsGrid>
        {stats.map((stat, index) => {
          const color = stat.performance
            ? qualitativePerformanceToColor(stat.performance)
            : 'rgba(255, 255, 255, 0.3)';

          return (
            <Tooltip key={index} content={stat.tooltip}>
              <StatItem color={color}>
                <StatItemValue fontSize={fontSize}>{stat.value}</StatItemValue>
                <StatItemLabel>{stat.label}</StatItemLabel>
              </StatItem>
            </Tooltip>
          );
        })}
      </StatsGrid>
    </Container>
  );
}

const Container = styled.div`
  margin-bottom: 16px;
`;

const CardHeader = styled.h3`
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #fab700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 8px;
`;

const StatItem = styled.div<{ color: string }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border-left: 3px solid ${(props) => props.color};
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
