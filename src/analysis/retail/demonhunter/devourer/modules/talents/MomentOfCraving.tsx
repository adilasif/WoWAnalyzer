import SPELLS from 'common/SPELLS';
import { TALENTS_DEMON_HUNTER } from 'common/TALENTS';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events from 'parser/core/Events';
import SpellUsable from 'parser/shared/modules/SpellUsable';

class MomentOfCraving extends Analyzer {
  static dependencies = {
    spellUsable: SpellUsable,
  };

  protected spellUsable!: SpellUsable;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DEMON_HUNTER.MOMENT_OF_CRAVING_TALENT);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.MOMENT_OF_CRAVING_BUFF),
      this.onApplyRefreshBuff,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.MOMENT_OF_CRAVING_BUFF),
      this.onApplyRefreshBuff,
    );
  }

  onApplyRefreshBuff() {
    if (this.spellUsable.isOnCooldown(SPELLS.REAP.id)) {
      this.spellUsable.endCooldown(SPELLS.REAP.id);
    }
  }
}

export default MomentOfCraving;
