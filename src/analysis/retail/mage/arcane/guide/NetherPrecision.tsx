import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { BaseMageGuide, MageGuideComponents, createRuleset } from '../../shared/guide';

import NetherPrecision from '../talents/NetherPrecision';

class NetherPrecisionGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    netherPrecision: NetherPrecision,
  };

  protected netherPrecision!: NetherPrecision;

  get netherPrecisionData(): BoxRowEntry[] {
    return this.netherPrecision.netherPrecisionBuffs.map((np) => {
      const oneStackLost = np.damageEvents?.length === 1;
      const bothStacksLost = !np.damageEvents;
      const fightEndOneLost = this.owner.fight.end_time === np.removed && oneStackLost;
      const fightEndBothLost = this.owner.fight.end_time === np.removed && bothStacksLost;

      return (
        createRuleset(np, this)
          // ===== INDIVIDUAL RULE DEFINITIONS =====

          .createRule({
            id: 'notOverwritten',
            check: () => !np.overwritten,
            failureText: 'Buff Overwritten',
            successText: 'Buff not overwritten',
            failurePerformance: QualitativePerformance.Fail,
          })

          .createRule({
            id: 'stacksUsed',
            check: () => !(oneStackLost || bothStacksLost),
            failureText: `${oneStackLost ? 'One stack' : 'Both stacks'} lost`,
            successText: 'Both stacks used properly',
            failurePerformance: QualitativePerformance.Fail,
          })

          .createRule({
            id: 'fightEndGrace',
            check: () => fightEndOneLost || fightEndBothLost,
            failureText: 'Stacks lost not near fight end',
            successText: `${fightEndOneLost ? 'One stack' : 'Both stacks'} lost close to fight end`,
            failurePerformance: QualitativePerformance.Ok,
          })

          // ===== PERFORMANCE CRITERIA =====

          .goodIf(['notOverwritten', 'stacksUsed']) // Good if not overwritten and all stacks used
          .okIf(['notOverwritten', 'fightEndGrace']) // Ok if lost near fight end but not overwritten

          // Fail if overwritten or stacks wasted

          .evaluate(np.applied)
      );
    });
  }

  get guideSubsection(): JSX.Element {
    const netherPrecision = <SpellLink spell={TALENTS.NETHER_PRECISION_TALENT} />;
    const arcaneMissiles = <SpellLink spell={TALENTS.ARCANE_MISSILES_TALENT} />;
    const arcaneBlast = <SpellLink spell={SPELLS.ARCANE_BLAST} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;

    const explanation = (
      <>
        <div>
          <b>{netherPrecision}</b> gets applied to you every time you cast {arcaneMissiles} to spend
          your {clearcasting} procs and buffs the next two {arcaneBlast} or {arcaneBarrage} casts
          within 10 seconds. So whenever you spend {clearcasting}, you should cast {arcaneBlast} or{' '}
          {arcaneBarrage} twice to get the buff's benefit before spending another {clearcasting}{' '}
          proc.
        </div>
      </>
    );

    const dataComponents = [
      MageGuideComponents.createPerCastSummary(
        TALENTS.NETHER_PRECISION_TALENT,
        this.netherPrecisionData,
      ),
    ];

    return MageGuideComponents.createSubsection(explanation, dataComponents, 'Nether Precision');
  }
}

export default NetherPrecisionGuide;
