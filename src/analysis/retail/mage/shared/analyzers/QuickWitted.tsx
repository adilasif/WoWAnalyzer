import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from './MageAnalyzer';
import Events, { InterruptEvent } from 'parser/core/Events';

const COOLDOWN_REDUCTION_MS = 4000;

class QuickWitted extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
  };

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.QUICK_WITTED_TALENT);
    this.addEventListener(
      Events.interrupt.by(SELECTED_PLAYER).spell(SPELLS.COUNTERSPELL),
      this.onInterrupt,
    );
  }

  onInterrupt(event: InterruptEvent) {
    this.spellUsable.reduceCooldown(SPELLS.COUNTERSPELL.id, COOLDOWN_REDUCTION_MS);
  }
}

export default QuickWitted;
