import SPELLS from 'common/SPELLS';
import MageAnalyzer from '../MageAnalyzer';

class ArcaneIntellect extends MageAnalyzer {
  get uptime() {
    return (
      this.selectedCombatant.getBuffUptime(SPELLS.ARCANE_INTELLECT.id) / this.owner.fightDuration
    );
  }
}

export default ArcaneIntellect;
