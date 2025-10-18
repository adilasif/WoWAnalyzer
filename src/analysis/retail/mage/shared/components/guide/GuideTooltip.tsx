import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { PerformanceMark } from 'interface/guide';

interface GuideTooltipProps {
  formatTimestamp: (timestamp: number) => string;
  performance: QualitativePerformance;
  tooltipItems: { perf: QualitativePerformance; detail: string }[];
  timestamp: number;
}

/**
 * Formatted tooltip for cast performance displays.
 * @param formatTimestamp - Function to format the timestamp
 * @param performance - Overall performance rating
 * @param tooltipItems - Array of detail items with individual performance ratings
 * @param timestamp - Event timestamp in ms
 */
export default function GuideTooltip({
  formatTimestamp,
  performance,
  tooltipItems,
  timestamp,
}: GuideTooltipProps) {
  return (
    <>
      <div>
        <b>@ {formatTimestamp(timestamp)}</b>
      </div>
      <div>
        <PerformanceMark perf={performance} /> {performance}
      </div>
      <div>
        {tooltipItems.map((t, i) => (
          <div key={i}>
            <PerformanceMark perf={t.perf} /> {t.detail}
            <br />
          </div>
        ))}
      </div>
    </>
  );
}
