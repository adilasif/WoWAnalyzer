import { TooltipElement } from 'interface';
import { qualitativePerformanceToColor } from 'interface/guide';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

interface InlineStatisticProps {
  value: string;
  label: string;
  tooltip: React.ReactNode;
  performance?: QualitativePerformance;
  fontSize?: string;
}

/**
 * Displays an inline statistic with a large colored value and tooltip.
 * Used for showing key metrics like average delay, hit count, active time, etc.
 */
export default function InlineStatistic({
  value,
  label,
  tooltip,
  performance,
  fontSize = '20px',
}: InlineStatisticProps) {
  const color = performance ? qualitativePerformanceToColor(performance) : undefined;

  return (
    <div>
      <TooltipElement content={tooltip}>
        <div
          style={{
            color,
            fontSize,
            fontWeight: 'bold',
          }}
        >
          {value} <small>{label}</small>
        </div>
      </TooltipElement>
    </div>
  );
}
