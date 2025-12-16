import Analyzer, { Options } from 'parser/core/Analyzer';
import TALENTS from 'common/TALENTS/shaman';

/**
 * Consuming 10 stacks of Maelstrom Weapon increases the damage of your next Stormstrike
 * or Lava Lash by 25% and causes them to generate a stack of Maelstrom Weapon.
 *
 * Example Log:
 *
 */
class LightningStrikes extends Analyzer {
  constructor(options: Options) {
    super(options);

    this.active = this.selectedCombatant.hasTalent(TALENTS.LIGHTNING_STRIKES_TALENT);

    if (!this.active) {
      return;
    }
  }
}

export default LightningStrikes;
