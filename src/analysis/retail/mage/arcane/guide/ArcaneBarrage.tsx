import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { formatPercentage } from 'common/format';
import { evaluateEvent } from '../../shared/components';
import { GuideBuilder } from '../../shared/components';
import Analyzer from 'parser/core/Analyzer';

import ArcaneBarrage from '../analyzers/ArcaneBarrage';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

class ArcaneBarrageGuide extends Analyzer {
  static dependencies = {
    arcaneBarrage: ArcaneBarrage,
  };

  protected arcaneBarrage!: ArcaneBarrage;

  isSunfury: boolean = this.selectedCombatant.hasTalent(TALENTS.MEMORY_OF_ALAR_TALENT);
  isSpellslinger: boolean = this.selectedCombatant.hasTalent(TALENTS.SPLINTERSTORM_TALENT);

  private readonly MAX_ARCANE_CHARGES = 4;
  private readonly LOW_MANA_THRESHOLD = 0.3;
  private readonly LOW_HEALTH_THRESHOLD = 0.35;
  private readonly TEMPO_THRESHOLD = 5000;
  private readonly AOE_THRESHOLD = 3;

  get arcaneBarrageData(): BoxRowEntry[] {
    return this.arcaneBarrage.barrageCasts.map((cast) => {
      const hasMaxCharges = cast.charges >= this.MAX_ARCANE_CHARGES;
      const isAOE = cast.targetsHit >= this.AOE_THRESHOLD;
      const hasLowMana = cast.mana !== undefined && cast.mana <= this.LOW_MANA_THRESHOLD;
      const hasLowHealth = cast.health !== undefined && cast.health < this.LOW_HEALTH_THRESHOLD;
      const hasPrecastSurge = cast.precast?.ability.guid === TALENTS.ARCANE_SURGE_TALENT.id;
      const tempoExpiring =
        this.isSpellslinger &&
        cast.tempoRemaining !== undefined &&
        cast.tempoRemaining < this.TEMPO_THRESHOLD;

      // Sunfury procs: Intuition, Glorious Incandescence, or Arcane Soul (with conditions)
      const hasSunfuryProc =
        this.isSunfury &&
        (cast.intuition ||
          cast.gloriousIncandescence ||
          (cast.arcaneSoul && (cast.netherPrecisionStacks > 0 || !cast.clearcasting)));

      // Spellslinger procs: Intuition or Arcane Orb available
      const hasSpellslingerProc = this.isSpellslinger && (cast.intuition || cast.arcaneOrbAvail);

      return evaluateEvent(cast.cast.timestamp, cast, this, {
        actionName: 'Arcane Barrage',

        failConditions: [
          {
            name: 'insufficientCharges',
            check: !hasMaxCharges,
            description: `Insufficient Arcane Charges (${cast.charges}/${this.MAX_ARCANE_CHARGES})`,
          },
        ],

        perfectConditions: [
          {
            name: 'precastSurge',
            check: hasMaxCharges && hasPrecastSurge,
            description: 'Perfect combo - Arcane Surge + 4 charges for maximum damage!',
          },
          {
            name: 'sunfuryProc',
            check: hasMaxCharges && hasSunfuryProc,
            description: 'Perfect Sunfury proc usage with max charges',
          },
          {
            name: 'spellslingerProc',
            check: hasMaxCharges && hasSpellslingerProc,
            description: 'Perfect Spellslinger proc usage with max charges',
          },
          {
            name: 'aoeOpportunity',
            check: isAOE && hasMaxCharges,
            description: `Excellent AOE usage - hit ${cast.targetsHit} targets with max charges`,
          },
          {
            name: 'aoeWithTempo',
            check: isAOE && tempoExpiring,
            description: `Perfect AOE + Tempo management - hit ${cast.targetsHit} targets before Tempo expires`,
          },
        ],

        goodConditions: [
          {
            name: 'lowMana',
            check: hasMaxCharges && hasLowMana,
            description: `Good emergency usage - low mana (${cast.mana ? formatPercentage(cast.mana, 1) : '???'}%)`,
          },
          {
            name: 'tempoExpiring',
            check: hasMaxCharges && tempoExpiring,
            description: 'Good timing - avoiding Arcane Tempo expiration',
          },
        ],

        okConditions: [
          {
            name: 'lowHealth',
            check: hasMaxCharges && hasLowHealth,
            description: `Target execute - ${cast.health ? formatPercentage(cast.health, 1) : '???'}% health remaining`,
          },
          {
            name: 'basicAOE',
            check: isAOE,
            description: `AOE usage - hit ${cast.targetsHit} targets (could optimize with procs/buffs)`,
          },
        ],

        defaultPerformance: QualitativePerformance.Fail,
        defaultMessage: 'Wasted Arcane Charges - no clear benefit to casting Barrage',
      });
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
    return new GuideBuilder(SPELLS.ARCANE_BARRAGE, 'Arcane Barrage')
      .explanation(explanation)
      .addCastSummary({
        castData: this.arcaneBarrageData,
      })
      .build();
  }
}

export default ArcaneBarrageGuide;
