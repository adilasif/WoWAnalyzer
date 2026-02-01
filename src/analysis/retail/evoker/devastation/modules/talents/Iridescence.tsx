import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/evoker';
import { formatNumber } from 'common/format';

import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import Events, {
  Ability,
  DamageEvent,
  EmpowerEndEvent,
  EventType,
  RemoveBuffEvent,
  RemoveBuffStackEvent,
  RemoveDebuffEvent,
} from 'parser/core/Events';
import { calculateEffectiveDamage } from 'parser/core/EventCalculateLib';

import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { IRIDESCENCE_MULTIPLIER } from 'analysis/retail/evoker/devastation/constants';
import { SpellLink } from 'interface';
import {
  getConsumeFlameTickEvent,
  getDamageEventsFromCast,
  getFireBreathDebuffEvents,
  getIridescenceConsumeEvent,
  isFromIridescenceConsume,
} from '../normalizers/CastLinkNormalizer';
import TalentSpellText from 'parser/ui/TalentSpellText';
import { encodeEventTargetString } from 'parser/shared/modules/Enemies';

type DamageSources = Record<number, { amount: number; spell: Ability }>;

// TODO:
// Living Flame DoT
// Show wasted buffs, maybe - would need to make sure we count wasted buff *stacks*

/** Casting an empower spell increases the damage of your next 2 spells of the same color by 20% within 10 sec. */
class Iridescence extends Analyzer {
  damageSources: DamageSources = {};

  wastedBlueBuffs = 0;
  wastedRedBuffs = 0;

  fireBreathTargets = new Set<string>();

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.IRIDESCENCE_TALENT);

    [Events.removebuff, Events.removebuffstack].forEach((eventType) => {
      this.addEventListener(
        eventType.by(SELECTED_PLAYER).spell([SPELLS.IRIDESCENCE_BLUE, SPELLS.IRIDESCENCE_RED]),
        this.onBuffRemove,
      );
    });

    this.addEventListener(
      Events.empowerEnd.by(SELECTED_PLAYER).spell([SPELLS.FIRE_BREATH, SPELLS.FIRE_BREATH_FONT]),
      this.onEmpowerEnd,
    );

    this.addEventListener(
      Events.damage
        .by(SELECTED_PLAYER)
        .spell([SPELLS.FIRE_BREATH_DOT, SPELLS.CONSUME_FLAME_DAMAGE]),
      this.onDamage,
    );

    this.addEventListener(
      Events.removedebuff.by(SELECTED_PLAYER).spell(SPELLS.FIRE_BREATH_DOT),
      this.onRemoveDebuff,
    );
  }

  private onBuffRemove(event: RemoveBuffEvent | RemoveBuffStackEvent) {
    const castEvent = getIridescenceConsumeEvent(event);

    if (castEvent) {
      if (castEvent.type === EventType.EmpowerEnd) {
        // Handle this seperately
        return;
      }

      getDamageEventsFromCast(castEvent).forEach((damageEvent) =>
        this.calculateDamage(damageEvent),
      );
    } else {
      if (event.ability.guid === SPELLS.IRIDESCENCE_BLUE.id) {
        this.wastedBlueBuffs += 1;
      } else {
        this.wastedRedBuffs += 1;
      }
    }
  }

  private calculateDamage(event: DamageEvent) {
    if (!this.damageSources[event.ability.guid]) {
      this.damageSources[event.ability.guid] = {
        amount: 0,
        spell: event.ability,
      };
    }

    this.damageSources[event.ability.guid].amount += calculateEffectiveDamage(
      event,
      IRIDESCENCE_MULTIPLIER,
    );
  }

  private onEmpowerEnd(event: EmpowerEndEvent) {
    const consumedIridescence = isFromIridescenceConsume(event);

    const debuffEvents = getFireBreathDebuffEvents(event);
    debuffEvents.forEach((debuffEvent) => {
      const target = encodeEventTargetString(debuffEvent);

      if (!target) {
        return;
      }

      if (consumedIridescence) {
        this.fireBreathTargets.add(target);
      } else {
        this.fireBreathTargets.delete(target);
      }
    });
  }

  private onRemoveDebuff(event: RemoveDebuffEvent) {
    const target = encodeEventTargetString(event);
    if (target) {
      if (this.fireBreathTargets.has(target)) {
        // Debuff is removed before the consume tick
        const consumeFlameTick = getConsumeFlameTickEvent(event);
        if (consumeFlameTick) {
          this.calculateDamage(consumeFlameTick);
        }
      }

      this.fireBreathTargets.delete(target);
    }
  }

  private onDamage(event: DamageEvent) {
    const target = encodeEventTargetString(event);
    if (!target || !this.fireBreathTargets.has(target)) {
      return;
    }

    this.calculateDamage(event);
  }

  statistic() {
    const damageItems = Object.values(this.damageSources)
      .sort((a, b) => b.amount - a.amount)
      .map((source) => ({
        spellId: source.spell.guid,
        valueTooltip: formatNumber(source.amount),
        value: source.amount,
      }));

    const totalAmount = damageItems.reduce((total, item) => total + item.value, 0);

    const tooltip = damageItems.map((item) => (
      <li key={`iridescence-damage-${item.spellId}`}>
        <SpellLink spell={item.spellId} /> Damage: {item.valueTooltip}
      </li>
    ));

    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL()}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={tooltip}
      >
        <TalentSpellText talent={TALENTS.IRIDESCENCE_TALENT}>
          <ItemDamageDone amount={totalAmount} />
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default Iridescence;
