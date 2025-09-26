import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { BaseMageGuide, MageGuideComponents, createRuleset } from '../../shared/guide';

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
      return (
        createRuleset(cast, this)
          // ===== INDIVIDUAL RULE DEFINITIONS =====

          .createRule({
            id: 'targetsHit',
            check: () => cast.targetsHit > 0,
            failureText: 'No targets hit',
            successText: `Targets Hit: ${cast.targetsHit}`,
            failurePerformance: QualitativePerformance.Fail,
          })

          .createRule({
            id: 'efficientCharges',
            check: () => cast.chargesBefore <= ORB_CHARGE_THRESHOLD,
            failureText: `Too many charges (${cast.chargesBefore}/${ORB_CHARGE_THRESHOLD})`,
            successText: `Efficient charge usage (${cast.chargesBefore}/${ORB_CHARGE_THRESHOLD})`,
            failurePerformance: QualitativePerformance.Fail,
          })

          // ===== PERFORMANCE CRITERIA =====

          .goodIf(['targetsHit', 'efficientCharges']) // Good if both conditions met

          // Fail if either condition not met

          .evaluate(cast.timestamp)
      );
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
            MageGuideComponents.createCooldownTimeline(
              SPELLS.ARCANE_ORB,
              this.arcaneOrb.averageHitsPerCast.toFixed(2),
              'avg targets hit',
              this.arcaneOrb.missedOrbs,
              this.arcaneOrbData,
              'Arcane Orb Usage',
            ),
          ]
        : [MageGuideComponents.createNoUsageComponent(SPELLS.ARCANE_ORB)];

    return MageGuideComponents.createSubsection(explanation, dataComponents, 'Arcane Orb');
  }
}

export default ArcaneOrbGuide;
