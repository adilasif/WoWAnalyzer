import { formatNumber } from 'common/format';
import TALENTS from 'common/TALENTS/mage';
import { SELECTED_PLAYER, Options } from 'parser/core/Analyzer';
import MageAnalyzer from '../../shared/MageAnalyzer';
import Events, { CastEvent, DamageEvent, GetRelatedEvents } from 'parser/core/Events';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import { EventRelations, StatisticBuilder } from '../../shared/helpers';

export default class ArcaneEcho extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
  };

  arcaneEchoes: ArcaneEchoData[] = [];

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

    this.arcaneEchoes.push({
      touchMagiCast: event.timestamp,
      damageEvents: damageEvents || [],
      totalDamage: this.getTotalDamage(damageEvents),
    });
  }

  private getTotalDamage(damageEvents: DamageEvent[]): number {
    let damage = 0;
    damageEvents.forEach((a) => (damage += a.amount + (a.absorbed || 0)));
    return damage;
  }

  get averageDamagePerTouch() {
    let totalDamage = 0;
    this.arcaneEchoes.forEach((a) => (totalDamage += a.totalDamage));
    return totalDamage / this.abilityTracker.getAbility(TALENTS.TOUCH_OF_THE_MAGI_TALENT.id).casts;
  }

  statistic() {
    return new StatisticBuilder(TALENTS.ARCANE_ECHO_TALENT)
      .category(STATISTIC_CATEGORY.TALENTS)
      .averageDamage({ amount: this.averageDamagePerTouch })
      .tooltip(
        <>
          On average you did {formatNumber(this.averageDamagePerTouch)} damage per Touch of the Magi
          cast.
        </>,
      )
      .build();
  }
}

export interface ArcaneEchoData {
  touchMagiCast: number;
  damageEvents?: DamageEvent[];
  totalDamage: number;
}
