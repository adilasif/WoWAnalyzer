import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { evaluateEvents, evaluatePerformance } from '../../shared/components';
import { GuideBuilder } from '../../shared/builders';

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
    return evaluateEvents(
      this.arcaneOrb.orbData,
      (cast: ArcaneOrbCast) => {
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
      this,
    );
  }

  get guideSubsection(): JSX.Element {
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;

    const explanation = (
      <>
        <div>
          <b>{arcaneOrb}</b> primary purpose is to quickly generate {arcaneCharge}s, as it is an
          instant that generates at least 2 charges.
        </div>
        <div>
          <ul>
            <li>Try to use it on cooldown, but only when you have 2 or fewer {arcaneCharge}s.</li>
          </ul>
        </div>
      </>
    );

    return new GuideBuilder(SPELLS.ARCANE_ORB)
      .explanation(explanation)
      .when(this.arcaneOrb.orbData.length > 0, (builder: GuideBuilder) =>
        builder
          .addStatistic({
            value: this.arcaneOrb.averageHitsPerCast.toFixed(2),
            label: 'avg targets hit',
            performance: evaluatePerformance(
              this.arcaneOrb.averageHitsPerCast,
              { minor: 2.0, average: 1.5, major: 1.0 },
              true,
            ),
          })
          .addCastEfficiency()
          .addCastSummary({
            castData: this.arcaneOrbData,
            title: 'Arcane Orb Usage',
          })
          .addCooldownTimeline(),
      )
      .when(this.arcaneOrb.orbData.length === 0, (builder: GuideBuilder) => builder.addNoUsage())
      .build();
  }
}

export default ArcaneOrbGuide;
