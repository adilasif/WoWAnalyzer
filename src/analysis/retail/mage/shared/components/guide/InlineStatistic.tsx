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
 * Displays an inline statistic with a large value and tooltip.
 * @param value - The main value to display
 * @param label - Label text displayed after the value in smaller font
 * @param tooltip - Tooltip content
 * @param performance - Optional performance rating for color coding
 * @param fontSize - Font size for the value (default: '20px')
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
