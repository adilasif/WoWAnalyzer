import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { BaseMageGuide, GuideComponents, evaluateGuide } from '../../shared/guide';

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

      return evaluateGuide(np.applied, np, this, {
        actionName: 'Nether Precision',

        // FAIL: Critical mistakes
        failConditions: [
          {
            name: 'overwritten',
            check: Boolean(np.overwritten),
            description:
              'Nether Precision buff overwritten - wasted proc by casting Arcane Missiles again',
          },
          {
            name: 'stacksWasted',
            check: (oneStackLost || bothStacksLost) && !(fightEndOneLost || fightEndBothLost),
            description: `${oneStackLost ? 'One stack' : 'Both stacks'} lost - should have used before expiry`,
          },
        ],

        // PERFECT: Used all stacks without overwriting
        perfectConditions: [
          {
            name: 'perfectUsage',
            check: !np.overwritten && !(oneStackLost || bothStacksLost),
            description: 'Perfect - used both Nether Precision stacks without overwriting',
          },
        ],

        // OK: Lost stacks at fight end (understandable)
        okConditions: [
          {
            name: 'fightEndLoss',
            check: !np.overwritten && (fightEndOneLost || fightEndBothLost),
            description: `${fightEndOneLost ? 'One stack' : 'Both stacks'} lost at fight end - acceptable`,
          },
        ],

        defaultPerformance: QualitativePerformance.Fail,
        defaultMessage: 'Nether Precision not used optimally',
      });
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
      GuideComponents.createPerCastSummary(
        TALENTS.NETHER_PRECISION_TALENT,
        this.netherPrecisionData,
      ),
    ];

    return GuideComponents.createSubsection(explanation, dataComponents, 'Nether Precision');
  }
}

export default NetherPrecisionGuide;
