import TALENTS from 'common/TALENTS/evoker';
import { formatNumber } from 'common/format';

import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import Events, { DamageEvent } from 'parser/core/Events';

import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import TalentSpellText from 'parser/ui/TalentSpellText';
import { REFINED_ESSENCE_MULTIPLIER } from 'analysis/retail/evoker/shared/constants';
import { calculateEffectiveDamage } from 'parser/core/EventCalculateLib';
import SPELLS from 'common/SPELLS/evoker';

const ESSENCE_ABILITIES = [
  SPELLS.DISINTEGRATE,
  SPELLS.PYRE,
  TALENTS.ERUPTION_TALENT,
  SPELLS.MASS_ERUPTION_DAMAGE,
];
/**
 * Essence spells deal 15% increased damage.
 */
class RefinedEssence extends Analyzer {
  extraDamage = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.REFINED_ESSENCE_TALENT);

    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(ESSENCE_ABILITIES),
      this.onDamage,
    );
  }

  onDamage(event: DamageEvent) {
    this.extraDamage += calculateEffectiveDamage(event, REFINED_ESSENCE_MULTIPLIER);
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(13)}
        size="flexible"
        category={STATISTIC_CATEGORY.HERO_TALENTS}
        tooltip={
          <>
            <li>Damage: {formatNumber(this.extraDamage)}</li>
          </>
        }
      >
        <TalentSpellText talent={TALENTS.REFINED_ESSENCE_TALENT}>
          <ItemDamageDone amount={this.extraDamage} />
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default RefinedEssence;
