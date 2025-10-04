import SPECS from 'game/SPECS';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from './MageAnalyzer';
import Events, { RemoveDebuffEvent } from 'parser/core/Events';

class ExcessFire extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
  };

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.EXCESS_FIRE_TALENT);
    this.addEventListener(
      Events.removedebuff.by(SELECTED_PLAYER).spell(SPELLS.LIVING_BOMB_EXCESS_FIRE_EXPLODE_DEBUFF),
      this.livingBombExplode,
    );
  }

  livingBombExplode(event: RemoveDebuffEvent) {
    if (this.selectedCombatant.spec === SPECS.FIRE_MAGE) {
      this.spellUsable.reduceCooldown(TALENTS.PHOENIX_FLAMES_TALENT.id, 10000);
    }
  }
}

export default ExcessFire;
