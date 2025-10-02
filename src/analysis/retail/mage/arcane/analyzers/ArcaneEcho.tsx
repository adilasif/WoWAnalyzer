import { formatNumber } from 'common/format';
import TALENTS from 'common/TALENTS/mage';
import { SpellIcon } from 'interface';
import Analyzer, { SELECTED_PLAYER, Options } from 'parser/core/Analyzer';
import Events, { CastEvent, DamageEvent, GetRelatedEvents } from 'parser/core/Events';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import { EventRelations, StatisticBuilder } from '../../shared/helpers';

class ArcaneEcho extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
  };
  protected abilityTracker!: AbilityTracker;

  arcaneEchoes: { touchMagiCast: number; damageEvents?: DamageEvent[]; totalDamage: number }[] = [];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.ARCANE_ECHO_TALENT);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.TOUCH_OF_THE_MAGI_TALENT),
      this.onTouchMagiCast,
    );
  }

  onTouchMagiCast(event: CastEvent) {
    const damageEvents: DamageEvent[] = GetRelatedEvents(event, EventRelations.DAMAGE);
    let damage = 0;
    damageEvents.forEach((a) => (damage += a.amount + (a.absorbed || 0)));

    this.arcaneEchoes.push({
      touchMagiCast: event.timestamp,
      damageEvents: damageEvents || [],
      totalDamage: damage,
    });
  }

  get averageDamagePerTouch() {
    let totalDamage = 0;
    this.arcaneEchoes.forEach((a) => (totalDamage += a.totalDamage));
    return totalDamage / this.abilityTracker.getAbility(TALENTS.TOUCH_OF_THE_MAGI_TALENT.id).casts;
  }

  statistic() {
    return new StatisticBuilder(TALENTS.ARCANE_ECHO_TALENT)
      .category(STATISTIC_CATEGORY.TALENTS)
      .content({
        content: (
          <>
            <SpellIcon spell={TALENTS.ARCANE_ECHO_TALENT} />{' '}
            {formatNumber(this.averageDamagePerTouch)} <small>Average Damage</small>
          </>
        ),
        tooltip: (
          <>
            On average you did {formatNumber(this.averageDamagePerTouch)} damage per Touch of the
            Magi cast.
          </>
        ),
      })
      .build();
  }
}

export default ArcaneEcho;
