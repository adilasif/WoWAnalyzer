import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { calculateEffectiveDamage } from 'parser/core/EventCalculateLib';
import Events, { DamageEvent } from 'parser/core/Events';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import { StatisticBuilder } from '../../shared/helpers';

const HEALTH_THRESHOLD = 0.35;
const DAMAGE_BONUS = 1;

class ArcaneBombardment extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
  };
  protected abilityTracker!: AbilityTracker;

  bonusDamage = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.ARCANE_BOMBARDMENT_TALENT);
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_BARRAGE),
      this.onBarrageDamage,
    );
  }

  onBarrageDamage(event: DamageEvent) {
    if (!event.hitPoints || !event.maxHitPoints) {
      return;
    }
    const enemyHealth = event.hitPoints / event.maxHitPoints;
    if (enemyHealth <= HEALTH_THRESHOLD) {
      this.bonusDamage += calculateEffectiveDamage(event, DAMAGE_BONUS);
    }
  }

  statistic() {
    return new StatisticBuilder()
      .spell(TALENTS.ARCANE_BOMBARDMENT_TALENT)
      .damage(this.bonusDamage)
      .build();
  }
}

export default ArcaneBombardment;
