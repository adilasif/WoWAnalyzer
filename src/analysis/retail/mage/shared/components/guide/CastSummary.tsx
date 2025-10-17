import Spell from 'common/SPELLS/Spell';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import GradiatedPerformanceBar from 'interface/guide/components/GradiatedPerformanceBar';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

interface CastSummaryProps {
  spell: Spell;
  castEntries: BoxRowEntry[];
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
  castEntries,
  showBreakdown = false,
}: CastSummaryProps): JSX.Element {
  // If breakdown is enabled, use the full component
  if (showBreakdown) {
    return <CastSummaryAndBreakdown spell={spell} castEntries={castEntries} />;
  }

  // Otherwise, just show the performance bar
  const perfect = castEntries.filter((it) => it.value === QualitativePerformance.Perfect).length;
  const good = castEntries.filter((it) => it.value === QualitativePerformance.Good).length;
  const ok = castEntries.filter((it) => it.value === QualitativePerformance.Ok).length;
  const bad = castEntries.filter((it) => it.value === QualitativePerformance.Fail).length;

  return (
    <GradiatedPerformanceBar
      perfect={{ count: perfect, label: 'Perfect casts' }}
      good={{ count: good, label: 'Good casts' }}
      ok={{ count: ok, label: 'Ok casts' }}
      bad={{ count: bad, label: 'Bad casts' }}
    />
  );
}
