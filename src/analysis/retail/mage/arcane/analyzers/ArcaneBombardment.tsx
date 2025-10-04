import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { calculateEffectiveDamage } from 'parser/core/EventCalculateLib';
import Events, { DamageEvent } from 'parser/core/Events';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import { StatisticBuilder } from '../../shared/helpers';
import { getTargetHealthPercentage } from '../../shared/helpers/eventHelpers';

const HEALTH_THRESHOLD = 0.35;
const DAMAGE_BONUS = 1;

class ArcaneBombardment extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
  };

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
    const enemyHealth = getTargetHealthPercentage(event);
    if (enemyHealth === undefined || enemyHealth > HEALTH_THRESHOLD) {
      return;
    }
    this.bonusDamage += calculateEffectiveDamage(event, DAMAGE_BONUS);
  }

  statistic() {
    return new StatisticBuilder(TALENTS.ARCANE_BOMBARDMENT_TALENT)
      .category(STATISTIC_CATEGORY.TALENTS)
      .dps({ amount: this.bonusDamage })
      .build();
  }
}

export default ArcaneBombardment;
