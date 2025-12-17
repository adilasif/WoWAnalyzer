import TALENTS from 'common/TALENTS/shaman';
import { Options, SELECTED_PLAYER, SELECTED_PLAYER_PET } from 'parser/core/Analyzer';
import Spell from 'common/SPELLS/Spell';
import Events, {
  AnyEvent,
  ApplyBuffEvent,
  CastEvent,
  DamageEvent,
  Event,
  EventType,
  HasSource,
  SourcedEvent,
  SummonEvent,
} from 'parser/core/Events';
import MajorCooldown, { CooldownTrigger } from 'parser/core/MajorCooldowns/MajorCooldown';
import CooldownUsage from 'parser/core/MajorCooldowns/CooldownUsage';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import TalentSpellText from 'parser/ui/TalentSpellText';
import SpellLink from 'interface/SpellLink';
import { ReactNode, type JSX } from 'react';
import SPELLS from 'common/SPELLS/shaman';
import { ChecklistUsageInfo, SpellUse } from 'parser/core/SpellUsage/core';
import { getLowestPerf, QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { plural } from '@lingui/core/macro';
import NPCS from 'common/NPCS';

export interface PrimalElementalCast extends CooldownTrigger<SummonEvent> {
  spells: Map<number, number>;
  damageDone: number;
  end: number;
}

const ELEMENTAL_SPELLS = [
  SPELLS.FIRE_ELEMENTAL_METEOR,
  SPELLS.FIRE_ELEMENTAL_IMMOLATE,
  SPELLS.FIRE_ELEMENTAL_FIRE_BLAST,
];

class PrimalElementalist extends MajorCooldown<PrimalElementalCast> {
  protected currentElemental: PrimalElementalCast | null = null;
  protected duration = 30000;
  protected selectedElemental?: number;

  private damageGained = 0;

  constructor(options: Options) {
    super({ spell: SPELLS.PRIMAL_FIRE_ELEMENTAL }, options);
    this.selectedElemental = this.owner.playerPets.find(
      (pet) => pet.guid === NPCS.PRIMAL_FIRE_ELEMENTAL.id,
    )?.id;

    this.active = this.selectedCombatant.hasTalent(TALENTS.PRIMAL_ELEMENTALIST_TALENT);

    if (!this.active) {
      return;
    }
    this.addEventListener(
      Events.summon.by(SELECTED_PLAYER).spell(SPELLS.PRIMAL_FIRE_ELEMENTAL),
      this.onSummonElemental,
    );
    this.addEventListener(Events.cast.by(SELECTED_PLAYER_PET), this.onElementalCast);
    this.addEventListener(Events.damage.by(SELECTED_PLAYER_PET), this.onElementalDamage);
    this.addEventListener(Events.any.by(SELECTED_PLAYER), this.onElementalEnd);
  }

  get activeElemental() {
    return this.currentElemental;
  }

  isPetEvent<T extends EventType>(event: Event<T>): event is SourcedEvent<T> {
    if (this.currentElemental && HasSource(event) && event.sourceID === this.selectedElemental) {
      return true;
    }
    return false;
  }

  explainPerformance(cast: PrimalElementalCast): SpellUse {
    const checklist: ChecklistUsageInfo[] = [...cast.spells.entries()].map(([spellId, count]) => {
      return {
        check: `spell-${spellId}`,
        timestamp: cast.event.timestamp,
        performance: count > 0 ? QualitativePerformance.Perfect : QualitativePerformance.Fail,
        summary: (
          <div>
            <SpellLink spell={spellId} /> cast{' '}
            {plural(count, { one: 'time', other: `${count} times` })}
          </div>
        ),
        details: (
          <div>
            <SpellLink spell={spellId} /> cast{' '}
            {plural(count, { one: 'time', other: `${count} times` })}
          </div>
        ),
      };
    });

    return {
      checklistItems: checklist,
      event: cast.event,
      performance: getLowestPerf(checklist.map((usage) => usage.performance)),
      extraDetails: null,
      performanceExplanation: null,
    };
  }

  /**
   * Player casts of selected elemental
   */
  onSummonElemental(event: SummonEvent): void {
    this.currentElemental = this.beginCooldownTrigger(
      event,
      ELEMENTAL_SPELLS.reduce((map, spell) => {
        map.set(spell.id, 0);
        return map;
      }, new Map<number, number>()),
    );
  }

  beginCooldownTrigger(event: SummonEvent, spells: Map<number, number>): PrimalElementalCast {
    return {
      event: event,
      spells: spells,
      damageDone: 0,
      end: event.timestamp + this.duration,
    };
  }

  onElementalEnd(event: AnyEvent) {
    if (this.currentElemental && this.currentElemental.end <= event.timestamp) {
      this.recordCooldown(this.currentElemental);
      this.currentElemental = null;
    }
  }

  /**
   * Spells cast by elemental
   */
  onElementalCast(event: CastEvent): void {
    if (!this.isPetEvent(event)) {
      return;
    }
    this.currentElemental!.spells.set(
      event.ability.guid,
      (this.currentElemental!.spells.get(event.ability.guid) ?? 0) + 1,
    );
  }

  onElementalDamage(event: DamageEvent) {
    if (!this.isPetEvent(event)) {
      return;
    }

    this.currentElemental!.damageDone += event.amount + (event.absorbed ?? 0);
    this.damageGained += event.amount + (event.absorbed ?? 0);
  }

  description(): ReactNode {
    return (
      <>
        If you have auto-cast disabled for your <SpellLink spell={this.spell} />, the breakdown
        shows how effectively you used the spells for your <SpellLink spell={this.spell} />.
      </>
    );
  }

  get guideSubsection(): JSX.Element {
    return <CooldownUsage analyzer={this} title={`Primal ${this.spell.name}`} />;
  }

  statistic() {
    return (
      <Statistic position={STATISTIC_ORDER.OPTIONAL()} size="flexible">
        <TalentSpellText talent={TALENTS.PRIMAL_ELEMENTALIST_TALENT}>
          <p>
            <small>
              <SpellLink spell={this.spell} />
            </small>
          </p>
          <p>
            <ItemDamageDone amount={this.damageGained} />
          </p>
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default PrimalElementalist;
