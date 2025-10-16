import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import MageAnalyzer from '../../shared/MageAnalyzer';
import {
  evaluateEvents,
  MageGuideSection,
  CastBreakdown,
  InlineStatistic,
  CastEfficiency,
  CooldownTimeline,
  NoCastsMessage,
} from '../../shared/components';
import { evaluateQualitativePerformanceByThreshold } from 'parser/ui/QualitativePerformance';

import ArcaneOrb from '../analyzers/ArcaneOrb';

interface ArcaneOrbCast {
  timestamp: number;
  targetsHit: number;
  chargesBefore: number;
}

const ORB_EFFICIENT_CHARGE_THRESHOLD = 2;

class ArcaneOrbGuide extends MageAnalyzer {
  static dependencies = { ...MageAnalyzer.dependencies, arcaneOrb: ArcaneOrb };

  protected arcaneOrb!: ArcaneOrb;

  get arcaneOrbData(): BoxRowEntry[] {
    return evaluateEvents({
      events: this.arcaneOrb.orbData,
      formatTimestamp: this.owner.formatTimestamp.bind(this.owner),
      evaluationLogic: (cast: ArcaneOrbCast) => {
        const hitTargets = cast.targetsHit > 0;
        const efficientCharges = cast.chargesBefore <= ORB_EFFICIENT_CHARGE_THRESHOLD;

        return {
          actionName: 'Arcane Orb',

          failConditions: [
            {
              name: 'missedTargets',
              check: !hitTargets,
              description: 'Failed to hit any targets',
            },
            {
              name: 'wastedCharges',
              check: !efficientCharges,
              description: `Inefficient usage - already had ${cast.chargesBefore} charges (use at ≤${ORB_EFFICIENT_CHARGE_THRESHOLD} charges)`,
            },
          ],

          perfectConditions: [
            {
              name: 'optimalUsage',
              check: hitTargets && efficientCharges && cast.targetsHit >= 2,
              description: `Perfect usage - ${cast.targetsHit} targets hit with efficient charge usage (${cast.chargesBefore}/${ORB_EFFICIENT_CHARGE_THRESHOLD})`,
            },
          ],

          goodConditions: [
            {
              name: 'goodUsage',
              check: hitTargets && efficientCharges,
              description: `Good usage - ${cast.targetsHit} target(s) hit with efficient charge usage (${cast.chargesBefore}/${ORB_EFFICIENT_CHARGE_THRESHOLD})`,
            },
          ],

          defaultPerformance: QualitativePerformance.Fail,
          defaultMessage: 'Arcane Orb usage needs improvement',
        };
      },
    });
  }

  get guideSubsection(): JSX.Element {
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;

    const explanation = (
      <>
        <b>{arcaneOrb}</b> primary purpose is to quickly generate {arcaneCharge}s, as it is an
        instant that generates at least 2 charges.
        <ul>
          <li>Try to use it on cooldown, but only when you have 2 or fewer {arcaneCharge}s.</li>
        </ul>
      </>
    );

    const avgHitsPerf = evaluateQualitativePerformanceByThreshold({
      actual: this.arcaneOrb.averageHitsPerCast,
      isGreaterThan: {
        perfect: 2.0,
        good: 1.5,
        ok: 1.0,
        fail: 0,
      },
    });

    return (
      <MageGuideSection spell={SPELLS.ARCANE_ORB} explanation={explanation}>
        {this.arcaneOrb.orbData.length === 0 ? (
          <NoCastsMessage spell={SPELLS.ARCANE_ORB} />
        ) : (
          <>
            <InlineStatistic
              value={this.arcaneOrb.averageHitsPerCast.toFixed(2)}
              label="avg targets hit"
              tooltip="Average targets hit per cast"
              performance={avgHitsPerf}
            />
            <CastEfficiency spell={SPELLS.ARCANE_ORB} useThresholds />
            <CastBreakdown spell={SPELLS.ARCANE_ORB} castEntries={this.arcaneOrbData} />
            <CooldownTimeline spell={SPELLS.ARCANE_ORB} />
          </>
        )}
      </MageGuideSection>
    );
  }
}

export default ArcaneOrbGuide;
