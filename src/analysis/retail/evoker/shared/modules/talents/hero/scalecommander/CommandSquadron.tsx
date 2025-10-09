import TALENTS from 'common/TALENTS/evoker';
import { formatNumber } from 'common/format';

import Analyzer, { Options, SELECTED_PLAYER_PET } from 'parser/core/Analyzer';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import Events, { DamageEvent } from 'parser/core/Events';

import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import TalentSpellText from 'parser/ui/TalentSpellText';
import SPELLS from 'common/SPELLS/evoker';

/**
 * Deep Breath / Breath of Eons summons 2 Dracthyr to fire 8 Pyres while flying.
 */
class CommandSquadron extends Analyzer {
  damage = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.COMMAND_SQUADRON_TALENT);

    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER_PET).spell([SPELLS.COMMAND_SQUADRON_PYRE]),
      this.onDamage,
    );
  }

  onDamage(event: DamageEvent) {
    this.damage += event.amount;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(13)}
        size="flexible"
        category={STATISTIC_CATEGORY.HERO_TALENTS}
        tooltip={
          <>
            <li>Damage: {formatNumber(this.damage)}</li>
          </>
        }
      >
        <TalentSpellText talent={TALENTS.COMMAND_SQUADRON_TALENT}>
          <ItemDamageDone amount={this.damage} />
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default CommandSquadron;
