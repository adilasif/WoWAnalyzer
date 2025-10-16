import TALENTS from 'common/TALENTS/mage';
import SPECS from 'game/SPECS';
import { SELECTED_PLAYER, Options } from 'parser/core/Analyzer';
import MageAnalyzer from '../MageAnalyzer';
import Events, { AbsorbedEvent } from 'parser/core/Events';
import DamageTaken from 'parser/shared/modules/throughput/DamageTaken';
import { MageStatistic } from '../components/statistics';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

class ElementalBarrier extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
    damageTaken: DamageTaken,
  };
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
        position={STATISTIC_ORDER.CORE(31)}
        size="flexible"
        tooltip={
          <>
            This is the amount of damage that was absorbed by your {this.barrierSpell.name}. Try to
            use this in anticipation of incoming damage to help reduce the amount of damage that
            your healers need to heal.
          </>
        }
        values={[
          { value: this.damageAbsorbed, label: 'Damage absorbed', format: 'number' },
          { value: this.absorbedPerCast, label: 'Avg. absorbed per barrier', format: 'number' },
          { value: this.percentAbsorbed, label: '% of Damage absorbed', format: 'percentage' },
        ]}
      />
    );
  }
}

export default ElementalBarrier;
