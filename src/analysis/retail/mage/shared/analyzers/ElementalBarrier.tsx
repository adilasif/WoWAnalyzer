import TALENTS from 'common/TALENTS/mage';
import SPECS from 'game/SPECS';
import { SELECTED_PLAYER, Options } from 'parser/core/Analyzer';
import Analyzer from 'parser/core/Analyzer';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import Events, { AbsorbedEvent } from 'parser/core/Events';
import DamageTaken from 'parser/shared/modules/throughput/DamageTaken';
import { MageStatistic } from '../components/statistics';

class ElementalBarrier extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
    damageTaken: DamageTaken,
  };
  protected abilityTracker!: AbilityTracker;
  protected damageTaken!: DamageTaken;

  damageAbsorbed = 0;
  barrierSpell: {
    id: number;
    name: string;
    icon: string;
  };

  constructor(options: Options) {
    super(options);
    const spec = this.selectedCombatant.specId;
    this.barrierSpell =
      spec === SPECS.FROST_MAGE.id
        ? TALENTS.ICE_BARRIER_TALENT
        : spec === SPECS.FIRE_MAGE.id
          ? TALENTS.BLAZING_BARRIER_TALENT
          : TALENTS.PRISMATIC_BARRIER_TALENT;
    this.addEventListener(
      Events.absorbed.by(SELECTED_PLAYER).spell(this.barrierSpell),
      this.onDamageAbsorbed,
    );
  }

  onDamageAbsorbed(event: AbsorbedEvent) {
    this.damageAbsorbed += event.amount;
  }

  get percentAbsorbed() {
    return this.damageAbsorbed / this.damageTaken.total.effective;
  }

  get absorbedPerCast() {
    return this.damageAbsorbed / this.abilityTracker.getAbility(this.barrierSpell.id).casts;
  }

  statistic() {
    return (
      <MageStatistic
        spell={this.barrierSpell}
        tooltip={
          <>
            This is the amount of damage that was absorbed by your {this.barrierSpell.name}. Try to
            use this in anticipation of incoming damage to help reduce the amount of damage that
            your healers need to heal.
          </>
        }
      >
        <MageStatistic.Number value={this.damageAbsorbed} label="Damage absorbed" />
        <MageStatistic.Number value={this.absorbedPerCast} label="Avg. absorbed per barrier" />
        <MageStatistic.Percentage value={this.percentAbsorbed} label="% of Damage absorbed" />
      </MageStatistic>
    );
  }
}

export default ElementalBarrier;
