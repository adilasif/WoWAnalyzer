import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { formatPercentage } from 'common/format';
import {
  BaseMageGuide,
  MageGuideComponents,
  createRuleset
} from '../../shared/guide';

import ArcaneBarrage from '../core/ArcaneBarrage';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

class ArcaneBarrageGuide extends BaseMageGuide {
  static dependencies = {
    arcaneBarrage: ArcaneBarrage,
  };

  protected arcaneBarrage!: ArcaneBarrage;

  isSunfury: boolean = this.selectedCombatant.hasTalent(TALENTS.MEMORY_OF_ALAR_TALENT);
  isSpellslinger: boolean = this.selectedCombatant.hasTalent(TALENTS.SPLINTERSTORM_TALENT);

  // Thresholds and Settings
  private readonly MAX_ARCANE_CHARGES = 4;
  private readonly LOW_MANA_THRESHOLD = 0.3;
  private readonly LOW_HEALTH_THRESHOLD = 0.35;
  private readonly TEMPO_THRESHOLD = 5000;
  private readonly AOE_THRESHOLD = 3;

  get arcaneBarrageData(): BoxRowEntry[] {
    return this.arcaneBarrage.barrageCasts.map((cast) => {
      return createRuleset(cast, this)

      // Check if AOE or ST
        .createRule({
          id: 'AOE',
          check: () => cast.targetsHit >= this.AOE_THRESHOLD
        })
        .createRule({
          id: 'ST',
          check: () => cast.targetsHit < this.AOE_THRESHOLD
        })

        // Check if they had Max Arcane Charges
        .createRule({
          id: 'maxedCharges',
          check: () => cast.charges >= this.MAX_ARCANE_CHARGES,
          failureText: `Low Arcane Charges (${cast.charges}/${this.MAX_ARCANE_CHARGES})`,
          failurePerformance: QualitativePerformance.Fail
        })

        // Check if they were low on mana
        .createRule({
          id: 'lowMana',
          active: () => cast.mana !== undefined,
          check: () => cast.mana! <= this.LOW_MANA_THRESHOLD,
          failureText: `High Mana (${formatPercentage(cast.mana!, 1)}%)`,
          failurePerformance: QualitativePerformance.Ok,
        })

        // Check to see if the target was about to die
        .createRule({
          id: 'lowHealth',
          active: cast.health !== undefined,
          check: () => cast.health! < this.LOW_HEALTH_THRESHOLD,
          failureText: `Target health not low (${formatPercentage(cast.health!, 1)}%)`,
          failurePerformance: QualitativePerformance.Ok
        })

        //Check if they had a Supporting Proc (Intuition, Glorious Incandescence, or Arcane Soul) if Sunfury
        .createRule({
          id: 'barrageProcSunfury',
          active: this.isSunfury,
          check: () => cast.intuition || cast.gloriousIncandescence || (cast.arcaneSoul && (cast.netherPrecisionStacks > 0 || !cast.clearcasting)),
          failureText: `Did not have Intuition, Glorious Incandescence, or Arcane Soul`,
          failurePerformance: QualitativePerformance.Fail
        })

        // Check if they had a Supporting Proc (Intuition) or Arcane Orb was available if Spellslinger
        .createRule({
          id: 'barrageProcSpellslinger',
          active: this.isSpellslinger,
          check: () => cast.intuition || cast.arcaneOrbAvail,
          failureText: `Did not have Intuition or Arcane Orb`,
          failurePerformance: QualitativePerformance.Fail
        })

        // Check if Arcane Tempo was about to expire
        .createRule({
          id: 'tempoExpiring',
          active: this.isSpellslinger && cast.tempoRemaining !== undefined,
          check: () => cast.tempoRemaining! < this.TEMPO_THRESHOLD
        })

        // Check if they cast Arcane Surge immediately beforehand
        .createRule({
          id: 'precastSurge',
          active: cast.precast !== undefined,
          check: () => cast.precast!.ability.guid === TALENTS.ARCANE_SURGE_TALENT.id,
          failureText: `No Arcane Surge Beforehand`,
          failurePerformance: QualitativePerformance.Ok
        })

        // Evaluate Overall Performance
        .perfectIf(['maxedCharges', 'precastSurge'])
        .perfectIf(['barrageProcSpellslinger'])
        .perfectIf(['barrageProcSunfury'])
        .perfectIf(['AOE', 'tempoExpiring'])
        .perfectIf(['AOE', 'maxedCharges'])
        .perfectIf(['noMana'])
        .goodIf(['lowMana'])
        .goodIf(['lowHealth'])
        .okIf(['sufficientCharges'])

        .evaluate(cast.cast.timestamp);
    });
  }

  get guideSubsection(): JSX.Element {
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const arcaneSoul = <SpellLink spell={SPELLS.ARCANE_SOUL_BUFF} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const gloriousIncandescence = <SpellLink spell={TALENTS.GLORIOUS_INCANDESCENCE_TALENT} />;
    const intuition = <SpellLink spell={SPELLS.INTUITION_BUFF} />;
    const netherPrecision = <SpellLink spell={TALENTS.NETHER_PRECISION_TALENT} />;
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;

    const explanation = (
      <>
        <div>
          <b>{arcaneBarrage}</b> is your {arcaneCharge} spender, removing the associated increased
          mana costs and damage. Only cast {arcaneBarrage} under one of the below conditions to
          maintain the damage increase for as long as possible.
        </div>
        <div>
          <ul>
            <li>{touchOfTheMagi} is almost available or you are out of mana.</li>
            {this.isSunfury && (
              <>
                <li>
                  You have {gloriousIncandescence}, or {intuition}.
                </li>
                <li>
                  You have {arcaneSoul} and either {netherPrecision} or don't have {clearcasting}
                </li>
              </>
            )}
            {this.isSpellslinger && (
              <li>
                You have {intuition} or {arcaneOrb}.
              </li>
            )}
          </ul>
        </div>
      </>
    );
    const dataComponents = [
      MageGuideComponents.createPerCastSummary(
        SPELLS.ARCANE_BARRAGE,
        this.arcaneBarrageData,
      ),
    ];

    return MageGuideComponents.createSubsection(
      explanation,
      dataComponents,
      'Arcane Barrage',
    );
  }
}

export default ArcaneBarrageGuide;
