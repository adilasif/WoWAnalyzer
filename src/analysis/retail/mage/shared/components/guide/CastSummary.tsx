import Spell from 'common/SPELLS/Spell';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import GradiatedPerformanceBar from 'interface/guide/components/GradiatedPerformanceBar';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import GuideTooltip from './GuideTooltip';

/**
 * Simple cast evaluation data structure.
 * Guides build this directly instead of using helpers.
 */
export interface CastEvaluation {
  timestamp: number;
  performance: QualitativePerformance;
  reason: string;
}

interface CastSummaryProps {
  spell: Spell;
  casts: CastEvaluation[];
  formatTimestamp: (timestamp: number) => string;
  /** If true, shows expandable breakdown. If false (default), only shows summary bar. */
  showBreakdown?: boolean;
}

/**
 * Displays cast performance summary and optionally detailed breakdown.
 *
 * By default, shows only a performance bar. Set `showBreakdown={true}` to enable
 * the expandable per-cast breakdown.
 */
export default function CastSummary({
  spell,
  casts,
  formatTimestamp,
  showBreakdown = false,
}: CastSummaryProps): JSX.Element {
  // If breakdown is enabled, convert to BoxRowEntry format for backward compatibility
  if (showBreakdown) {
    const castEntries: BoxRowEntry[] = casts.map((cast) => ({
      value: cast.performance,
      tooltip: (
        <GuideTooltip
          formatTimestamp={formatTimestamp}
          performance={cast.performance}
          tooltipItems={[{ perf: cast.performance, detail: cast.reason }]}
          timestamp={cast.timestamp}
        />
      ),
    }));
    return <CastSummaryAndBreakdown spell={spell} castEntries={castEntries} />;
  }

  // Otherwise, just show the performance bar
  const perfect = casts.filter((c) => c.performance === QualitativePerformance.Perfect).length;
  const good = casts.filter((c) => c.performance === QualitativePerformance.Good).length;
  const ok = casts.filter((c) => c.performance === QualitativePerformance.Ok).length;
  const bad = casts.filter((c) => c.performance === QualitativePerformance.Fail).length;

  return (
    <GradiatedPerformanceBar
      perfect={{ count: perfect, label: 'Perfect casts' }}
      good={{ count: good, label: 'Good casts' }}
      ok={{ count: ok, label: 'Ok casts' }}
      bad={{ count: bad, label: 'Bad casts' }}
    />
  );
}
