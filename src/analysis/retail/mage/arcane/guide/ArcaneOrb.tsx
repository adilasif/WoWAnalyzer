import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { BaseMageGuide, GuideComponents, evaluateGuide } from '../../shared/guide';

import ArcaneOrb from '../core/ArcaneOrb';

const ORB_CHARGE_THRESHOLD = 2;

class ArcaneOrbGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    arcaneOrb: ArcaneOrb,
  };

  protected arcaneOrb!: ArcaneOrb;

  get arcaneOrbData(): BoxRowEntry[] {
    return this.arcaneOrb.orbCasts.map((cast) => {
      const hitTargets = cast.targetsHit > 0;
      const efficientCharges = cast.chargesBefore <= ORB_CHARGE_THRESHOLD;

      return evaluateGuide(cast.timestamp, cast, this, {
        actionName: 'Arcane Orb',

        // FAIL: Critical mistakes
        failConditions: [
          {
            name: 'missedTargets',
            check: !hitTargets,
            description: 'Failed to hit any targets - wasted cooldown',
          },
          {
            name: 'wastedCharges',
            check: !efficientCharges,
            description: `Inefficient usage - already had ${cast.chargesBefore} charges (use at ≤${ORB_CHARGE_THRESHOLD} charges)`,
          },
        ],

        // PERFECT: Optimal usage
        perfectConditions: [
          {
            name: 'optimalUsage',
            check: hitTargets && efficientCharges && cast.targetsHit >= 2,
            description: `Perfect usage - ${cast.targetsHit} targets hit with efficient charge usage (${cast.chargesBefore}/${ORB_CHARGE_THRESHOLD})`,
          },
        ],

        // GOOD: Standard usage
        goodConditions: [
          {
            name: 'standardUsage',
            check: hitTargets && efficientCharges,
            description: `Good usage - ${cast.targetsHit} target(s) hit with efficient charge usage (${cast.chargesBefore}/${ORB_CHARGE_THRESHOLD})`,
          },
        ],

        defaultPerformance: QualitativePerformance.Fail,
        defaultMessage: 'Suboptimal Arcane Orb usage',
      });
    });
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

    const dataComponents =
      this.arcaneOrb.orbCasts.length > 0
        ? [
            GuideComponents.createCooldownTimeline(
              SPELLS.ARCANE_ORB,
              this.arcaneOrb.averageHitsPerCast.toFixed(2),
              'avg targets hit',
              this.arcaneOrb.missedOrbs,
              this.arcaneOrbData,
              'Arcane Orb Usage',
            ),
          ]
        : [GuideComponents.createNoUsageComponent(SPELLS.ARCANE_ORB)];

    return GuideComponents.createSubsection(explanation, dataComponents, 'Arcane Orb');
  }
}

export default ArcaneOrbGuide;
