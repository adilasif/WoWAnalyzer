import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { PerformanceMark } from 'interface/guide';

interface GuideTooltipProps {
  formatTimestamp: (timestamp: number) => string;
  performance: QualitativePerformance;
  tooltipItems: { perf: QualitativePerformance; detail: string }[];
  timestamp: number;
}

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
