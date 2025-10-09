import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from './MageAnalyzer';
import Events, { RemoveBuffEvent } from 'parser/core/Events';

class MasterOfTime extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
  };

  constructor(props: Options) {
    super(props);
    this.active = this.selectedCombatant.hasTalent(TALENTS.MASTER_OF_TIME_TALENT);
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.ALTER_TIME_BUFF),
      this.resetBlink,
    );
  }

  resetBlink(event: RemoveBuffEvent) {
    if (this.spellUsable.isOnCooldown(SPELLS.BLINK.id)) {
      this.spellUsable.endCooldown(SPELLS.BLINK.id);
    }
  }
}

export default MasterOfTime;
