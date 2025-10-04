import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { calculateEffectiveDamage } from 'parser/core/EventCalculateLib';
import Events, { CastEvent, DamageEvent } from 'parser/core/Events';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import { StatisticBuilder } from '../../shared/helpers';

const DAMAGE_BONUS_PER_STACK = 0.05;

class ArcaneHarmony extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
    abilityTracker: AbilityTracker,
  };
  protected abilityTracker!: AbilityTracker;

  bonusDamage = 0;
  stacks = 0;
  totalStacks = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.ARCANE_HARMONY_TALENT);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_BARRAGE),
      this.onBarrageCast,
    );
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_BARRAGE),
      this.onBarrageDamage,
    );
  }

  onBarrageCast(event: CastEvent) {
    const buff = this.selectedCombatant.getBuff(SPELLS.ARCANE_HARMONY_BUFF.id);
    if (buff && buff.stacks) {
      this.stacks = buff.stacks;
    }
  }

  onBarrageDamage(event: DamageEvent) {
    if (this.stacks > 0) {
      this.bonusDamage += calculateEffectiveDamage(event, DAMAGE_BONUS_PER_STACK * this.stacks);
      this.totalStacks += this.stacks;
      this.stacks = 0;
    }
  }

  get averageStacks() {
    return this.totalStacks / this.abilityTracker.getAbility(SPELLS.ARCANE_BARRAGE.id).casts;
  }

  get dpsIncrease() {
    const fight = this.owner.fight;
    const totalFightTime = fight.end_time - fight.start_time;

    return (this.bonusDamage / totalFightTime) * 1000;
  }

  statistic() {
    return new StatisticBuilder(SPELLS.ARCANE_HARMONY_BUFF)
      .category(STATISTIC_CATEGORY.TALENTS)
      .value({ value: this.bonusDamage, label: 'Bonus Damage', format: 'number' })
      .value({ value: this.dpsIncrease, label: 'DPS', format: 'number' })
      .value({ value: this.averageStacks, label: 'Avg. stacks per Barrage', format: 'number' })
      .build();
  }
}

export default ArcaneHarmony;
