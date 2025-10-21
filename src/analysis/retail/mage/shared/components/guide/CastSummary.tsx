import Spell from 'common/SPELLS/Spell';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import GradiatedPerformanceBar from 'interface/guide/components/GradiatedPerformanceBar';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { useFight } from 'interface/report/context/FightContext';
import { formatDuration } from 'common/format';
import { SpellIcon } from 'interface';
import GuideTooltip from './GuideTooltip';

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

  // Show "no casts" message if there are no casts
  if (!casts || casts.length === 0) {
    return (
      <div>
        <SpellIcon spell={spell} /> <strong>No {spell.name} casts recorded.</strong>
        <br />
        <small>
          Make sure you are using this spell if it is available to you and you are specced into it.
        </small>
      </div>
    );
  }

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
