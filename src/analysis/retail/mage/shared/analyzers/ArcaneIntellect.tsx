import SPELLS from 'common/SPELLS';
import MageAnalyzer from '../MageAnalyzer';
import { MageStatistic } from '../components/statistics';

class ArcaneIntellect extends MageAnalyzer {
  get uptime() {
    return (
      this.selectedCombatant.getBuffUptime(SPELLS.ARCANE_INTELLECT.id) / this.owner.fightDuration
    );
  }

  statistic() {
    return (
      <MageStatistic
        spell={SPELLS.ARCANE_INTELLECT}
        tooltip={<span>Percentage of fight with Arcane Intellect active.</span>}
      >
        <MageStatistic.Percentage value={this.uptime} label="Buff Uptime" />
      </MageStatistic>
    );
  }
}

export default ArcaneIntellect;
