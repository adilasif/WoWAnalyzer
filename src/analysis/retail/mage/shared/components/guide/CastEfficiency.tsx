import Spell from 'common/SPELLS/Spell';
import { formatPercentage } from 'common/format';
import { useAnalyzer } from 'interface/guide';
import CastEfficiency from 'parser/shared/modules/CastEfficiency';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import InlineStatistic from './InlineStatistic';

interface CastEfficiencyInlineProps {
  spell: Spell;
  useThresholds?: boolean;
}

/**
 * Displays cast efficiency as an inline statistic with optional threshold coloring.
 * Shows percentage and "X of Y possible casts" with tooltip.
 */
export default function CastEfficiencyInline({ spell, useThresholds }: CastEfficiencyInlineProps) {
  const castEfficObj = useAnalyzer(CastEfficiency)!.getCastEfficiencyForSpellId(spell.id);

  if (!castEfficObj) {
    return (
      <div style={{ fontSize: '16px', fontStyle: 'italic' }}>
        Error getting Cast Efficiency data
      </div>
    );
  }

  let performance: QualitativePerformance | undefined;
  if (useThresholds && castEfficObj.efficiency) {
    const effectiveUtil =
      castEfficObj.casts === castEfficObj.maxCasts ? 1 : castEfficObj.efficiency;
    if (effectiveUtil < castEfficObj.majorIssueEfficiency) {
      performance = QualitativePerformance.Fail;
    } else if (effectiveUtil < castEfficObj.averageIssueEfficiency) {
      performance = QualitativePerformance.Ok;
    } else if (effectiveUtil < castEfficObj.recommendedEfficiency) {
      performance = QualitativePerformance.Good;
    } else {
      performance = QualitativePerformance.Perfect;
    }
  }

  return (
    <InlineStatistic
      value={`${formatPercentage(castEfficObj.efficiency || 0, 0)}%`}
      label={`cast efficiency (${castEfficObj.casts} of ${castEfficObj.maxCasts} possible casts)`}
      tooltip={`You cast ${spell.name} ${castEfficObj.casts} times out of ${castEfficObj.maxCasts} possible casts (${formatPercentage(castEfficObj.efficiency || 0, 1)}% efficiency)`}
      performance={performance}
      fontSize="16px"
    />
  );
}
