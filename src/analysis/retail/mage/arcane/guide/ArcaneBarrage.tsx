import { type JSX } from 'react';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { formatPercentage, formatDuration, formatNumber } from 'common/format';
import GuideSection from 'interface/guide/components/GuideSection';
import CastDetail, {
  type PerCastData,
  type PerCastStat,
} from 'interface/guide/components/CastDetail';
import Analyzer from 'parser/core/Analyzer';
import ArcaneBarrage, { ArcaneBarrageData } from '../analyzers/ArcaneBarrage';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { ARCANE_SALVO_MAX_STACKS } from '../../shared';

class ArcaneBarrageGuide extends Analyzer {
  static dependencies = {
    arcaneBarrage: ArcaneBarrage,
  };

  protected arcaneBarrage!: ArcaneBarrage;

  isSunfury: boolean = this.selectedCombatant.hasTalent(TALENTS.MEMORY_OF_ALAR_TALENT);
  isSpellslinger: boolean = this.selectedCombatant.hasTalent(TALENTS.SPLINTERSTORM_TALENT);
  hasArcaneSalvo: boolean = this.selectedCombatant.hasTalent(TALENTS.ARCANE_SALVO_TALENT);

  private readonly MAX_ARCANE_CHARGES = 4;
  private readonly LOW_MANA_THRESHOLD = 0.3;
  private readonly LOW_HEALTH_THRESHOLD = 0.35;
  private readonly AOE_THRESHOLD = 3;

  private buildCastStats(cast: ArcaneBarrageData): PerCastStat[] {
    const stats: PerCastStat[] = [];

    //Arcane Charges
    stats.push({
      label: 'Arcane Charges',
      value: `${cast.charges} / ${this.MAX_ARCANE_CHARGES}`,
      tooltip: `The number of Arcane Charge you had when Arcane Barrage was cast.`,
    });

    //Targets Hit
    if (cast.targetsHit > 0) {
      stats.push({
        label: 'Targets Hit',
        value: `${cast.targetsHit}`,
        tooltip: `The number of targets hit by the Arcane Barrage cast`,
      });
    }

    //Mana
    if (cast.mana !== undefined) {
      stats.push({
        label: 'Mana',
        value: formatPercentage(cast.mana, 0),
        tooltip: `The player's mana before Arcane Barrage was cast.`,
      });
    }

    //Arcane Salvo
    if (this.hasArcaneSalvo && cast.salvoStacks) {
      stats.push({
        label: 'Arcane Salvo Stacks',
        value: formatNumber(cast.salvoStacks),
        tooltip: `The number of Arcane Salvo stacks the player had before Arcane Barrage was cast.`,
      });
    }

    //Precast
    if (cast.precast) {
      stats.push({
        label: 'Precast Spell',
        value: cast.precast.ability.name,
        tooltip: `The spell cast immediately before Arcane Barrage.`,
      });
    }

    // Active Buffs
    const activeBuffs: JSX.Element[] = [];
    if (cast.clearcasting)
      activeBuffs.push(<SpellLink key="cc" spell={SPELLS.CLEARCASTING_ARCANE} />);
    if (cast.gloriousIncandescence)
      activeBuffs.push(<SpellLink key="gi" spell={TALENTS.GLORIOUS_INCANDESCENCE_TALENT} />);
    if (cast.burdenOfPower)
      activeBuffs.push(<SpellLink key="bp" spell={SPELLS.BURDEN_OF_POWER_BUFF} />);

    if (activeBuffs.length > 0) {
      stats.push({
        label: 'Active Buffs',
        value: `${activeBuffs.length}`,
        tooltip: (
          <>
            {activeBuffs.map((buff, i) => (
              <div key={i}>{buff}</div>
            ))}
          </>
        ),
      });
    }

    // touch of the Magi Cooldown
    if (cast.touchCD) {
      stats.push({
        label: 'Touch CD',
        value: formatDuration(cast.touchCD),
        tooltip: `Cooldown Remaining on Touch of the Magi`,
      });
    }

    return stats;
  }

  private evaluateBarrageCast(cast: ArcaneBarrageData): PerCastData {
    const hasMaxCharges = cast.charges >= this.MAX_ARCANE_CHARGES;
    const isAOE = cast.targetsHit >= this.AOE_THRESHOLD;
    const hasLowMana = cast.mana !== undefined && cast.mana <= this.LOW_MANA_THRESHOLD;
    const hasLowHealth = cast.health !== undefined && cast.health <= this.LOW_HEALTH_THRESHOLD;

    const statData = {
      stats: this.buildCastStats(cast),
      timestamp: this.owner.formatTimestamp(cast.cast.timestamp),
    };

    // FAIL CONDITIONS
    if (!hasMaxCharges) {
      return {
        performance: QualitativePerformance.Fail,
        details: `Insufficient Arcane Charges (${cast.charges}/${this.MAX_ARCANE_CHARGES}) - should wait for maximum charges`,
        ...statData,
      };
    }

    // PERFECT CONDITIONS
    // 20 Stacks of Arcane Salvo
    if (this.hasArcaneSalvo && cast.salvoStacks >= ARCANE_SALVO_MAX_STACKS) {
      return {
        performance: QualitativePerformance.Perfect,
        details: (
          <>
            Had {ARCANE_SALVO_MAX_STACKS} Stacks of{' '}
            <SpellLink spell={TALENTS.ARCANE_SALVO_TALENT} />.
          </>
        ),
        ...statData,
      };
    }

    // Arcane Orb Available with Clearcasting
    if (cast.arcaneOrbAvail && cast.clearcasting) {
      return {
        performance: QualitativePerformance.Perfect,
        details: (
          <>
            <SpellLink spell={TALENTS.ARCANE_ORB_TALENT} /> was Available with{' '}
            <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />
          </>
        ),
        ...statData,
      };
    }

    //Arcane Orb Available in AOE
    if (isAOE && cast.arcaneOrbAvail) {
      return {
        performance: QualitativePerformance.Perfect,
        details: (
          <>
            <SpellLink spell={SPELLS.ARCANE_BARRAGE} /> used in AOE with{' '}
            <SpellLink spell={TALENTS.ARCANE_ORB_TALENT} /> Available.
          </>
        ),
        ...statData,
      };
    }

    // GOOD CONDITIONS
    if (isAOE && hasMaxCharges) {
      return {
        performance: QualitativePerformance.Perfect,
        details: `Excellent AOE usage - hit ${cast.targetsHit} targets with max charges`,
        ...statData,
      };
    }

    // Low mana
    if (hasMaxCharges && hasLowMana) {
      return {
        performance: QualitativePerformance.Good,
        details: `Good emergency usage - low mana (${formatPercentage(cast.mana!, 1)}) necessitated charge spending`,
        ...statData,
      };
    }

    // OK CONDITIONS
    if (hasMaxCharges && hasLowHealth) {
      return {
        performance: QualitativePerformance.Ok,
        details: `Target execute - ${formatPercentage(cast.health!, 1)}% health remaining`,
        ...statData,
      };
    }

    if (isAOE) {
      return {
        performance: QualitativePerformance.Ok,
        details: `AOE usage - hit ${cast.targetsHit} targets (could optimize with procs/buffs)`,
        ...statData,
      };
    }

    // DEFAULT FAIL
    return {
      performance: QualitativePerformance.Fail,
      details: 'Wasted Arcane Charges - no clear benefit to casting Barrage',
      ...statData,
    };
  }

  get guideSubsection(): JSX.Element {
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const arcaneSalvo = <SpellLink spell={TALENTS.ARCANE_SALVO_TALENT} />;

    const explanation = (
      <>
        <b>{arcaneBarrage}</b> is your {arcaneCharge} spender, removing the associated increased
        mana costs and damage. Only cast {arcaneBarrage} with {this.MAX_ARCANE_CHARGES}{' '}
        {arcaneCharge}s plus one of the below conditions to maintain the damage increase for as long
        as possible.
        <ul>
          {this.hasArcaneSalvo && (
            <>
              <li>
                You have {ARCANE_SALVO_MAX_STACKS} stacks of {arcaneSalvo}
              </li>
            </>
          )}
          <li>{touchOfTheMagi} is almost available or you are out of mana.</li>
          {this.isSpellslinger && (
            <li>
              You have {clearcasting} and {arcaneOrb}.
            </li>
          )}
          {this.isSpellslinger && (
            <li>
              You have {arcaneOrb} and {arcaneBarrage} will hit at least {this.AOE_THRESHOLD}{' '}
              targets.
            </li>
          )}
        </ul>
      </>
    );

    return (
      <GuideSection
        spell={SPELLS.ARCANE_BARRAGE}
        explanation={explanation}
        explanationPercent={30}
        title="Arcane Barrage"
      >
        <CastDetail
          title="Arcane Barrage Casts"
          casts={this.arcaneBarrage.barrageData.map((cast) => this.evaluateBarrageCast(cast))}
        />
      </GuideSection>
    );
  }
}

export default ArcaneBarrageGuide;
