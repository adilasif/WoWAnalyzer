import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { formatPercentage } from 'common/format';
import { evaluateEvents } from '../../shared/components';
import { GuideBuilder } from '../../shared/builders';
import MageAnalyzer from '../../shared/MageAnalyzer';

import ArcaneBarrage from '../analyzers/ArcaneBarrage';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';

class ArcaneBarrageGuide extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
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
    return evaluateEvents({
      events: this.arcaneBarrage.barrageData,
      formatTimestamp: this.owner.formatTimestamp.bind(this.owner),
      evaluationLogic: (ab) => {
        const hasMaxCharges = ab.charges >= this.MAX_ARCANE_CHARGES;
        const isAOE = ab.targetsHit >= this.AOE_THRESHOLD;
        const hasLowMana = ab.mana !== undefined && ab.mana <= this.LOW_MANA_THRESHOLD;
        const hasLowHealth = ab.health !== undefined && ab.health < this.LOW_HEALTH_THRESHOLD;
        const hasPrecastSurge = ab.precast?.ability.guid === TALENTS.ARCANE_SURGE_TALENT.id;
        const tempoExpiring =
          ab.tempoRemaining !== undefined && ab.tempoRemaining < this.TEMPO_THRESHOLD;

        const hasSunfuryProc = ab.gloriousIncandescence || (ab.arcaneSoul && !ab.clearcasting);

        const hasSpellslingerProc = ab.arcaneOrbAvail;

        return {
          actionName: 'Arcane Barrage',

          failConditions: [
            {
              name: 'insufficientCharges',
              check: !hasMaxCharges,
              description: `Insufficient Arcane Charges (${ab.charges}/${this.MAX_ARCANE_CHARGES})`,
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
              active: this.isSunfury,
              check: hasMaxCharges && hasSunfuryProc,
              description: 'Perfect Sunfury proc usage with max charges',
            },
            {
              name: 'spellslingerProc',
              active: this.isSpellslinger,
              check: hasMaxCharges && hasSpellslingerProc,
              description: 'Perfect Spellslinger proc usage with max charges',
            },
            {
              name: 'aoeOpportunity',
              check: isAOE && hasMaxCharges,
              description: `Excellent AOE usage - hit ${ab.targetsHit} targets with max charges`,
            },
            {
              name: 'aoeWithTempo',
              active: this.isSpellslinger,
              check: isAOE && tempoExpiring,
              description: `Perfect AOE + Tempo management - hit ${ab.targetsHit} targets before Tempo expires`,
            },
          ],

          goodConditions: [
            {
              name: 'lowMana',
              check: hasMaxCharges && hasLowMana,
              description: `Good emergency usage - low mana (${ab.mana ? formatPercentage(ab.mana, 1) : '???'}%)`,
            },
            {
              name: 'tempoExpiring',
              active: this.isSpellslinger,
              check: hasMaxCharges && tempoExpiring,
              description: 'Good timing - avoiding Arcane Tempo expiration',
            },
          ],

          okConditions: [
            {
              name: 'lowHealth',
              check: hasMaxCharges && hasLowHealth,
              description: `Target execute - ${ab.health ? formatPercentage(ab.health, 1) : '???'}% health remaining`,
            },
            {
              name: 'basicAOE',
              check: isAOE,
              description: `AOE usage - hit ${ab.targetsHit} targets (could optimize with procs/buffs)`,
            },
          ],

          defaultPerformance: QualitativePerformance.Fail,
          defaultMessage: 'Wasted Arcane Charges - no clear benefit to casting Barrage',
        };
      },
    });
  }

  get guideSubsection(): JSX.Element {
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const arcaneSoul = <SpellLink spell={SPELLS.ARCANE_SOUL_BUFF} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const gloriousIncandescence = <SpellLink spell={TALENTS.GLORIOUS_INCANDESCENCE_TALENT} />;
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
                <li>You have {gloriousIncandescence}.</li>
                <li>
                  You have {arcaneSoul} and either or don't have {clearcasting}
                </li>
              </>
            )}
            {this.isSpellslinger && <li>You have or {arcaneOrb}.</li>}
          </ul>
        </div>
      </>
    );
    return new GuideBuilder(SPELLS.ARCANE_BARRAGE)
      .explanation(explanation)
      .addCastSummary({
        castData: this.arcaneBarrageData,
      })
      .build();
  }
}

export default ArcaneBarrageGuide;
