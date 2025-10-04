import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from '../../shared/MageAnalyzer';
import Events, { CastEvent } from 'parser/core/Events';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import { ThresholdStyle } from 'parser/core/ParseResults';
import ArcaneChargeTracker from '../core/ArcaneChargeTracker';
import { getManaPercentage } from '../../shared/helpers';

export default class ArcaneSurge extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
    abilityTracker: AbilityTracker,
    chargeTracker: ArcaneChargeTracker,
  };
  protected abilityTracker!: AbilityTracker;
  protected chargeTracker!: ArcaneChargeTracker;

  hasSiphonStorm: boolean = this.selectedCombatant.hasTalent(TALENTS.EVOCATION_TALENT);
  hasNetherPrecision: boolean = this.selectedCombatant.hasTalent(TALENTS.NETHER_PRECISION_TALENT);

  surgeCasts: ArcaneSurgeCast[] = [];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.ARCANE_SURGE_TALENT);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.ARCANE_SURGE_TALENT),
      this.onSurgeCast,
    );
  }

  onSurgeCast(event: CastEvent) {
    this.surgeCasts.push({
      ordinal: this.surgeCasts.length + 1,
      cast: event.timestamp,
      // Simple inline values
      charges: this.chargeTracker.current,
      siphonStormBuff: this.selectedCombatant.hasBuff(SPELLS.SIPHON_STORM_BUFF.id),
      netherPrecision: this.selectedCombatant.hasBuff(SPELLS.NETHER_PRECISION_BUFF.id),
      // Complex values from shared helpers
      mana: getManaPercentage(event), // ✅ Shared helper
    });
  }

  get averageManaPercent() {
    let manaPercentTotal = 0;
    this.surgeCasts.forEach((s) => (manaPercentTotal += s.mana || 0));
    return manaPercentTotal / this.abilityTracker.getAbility(TALENTS.ARCANE_SURGE_TALENT.id).casts;
  }

  get arcaneSurgeManaThresholds() {
    return {
      actual: this.averageManaPercent,
      isLessThan: {
        minor: 0.98,
        average: 0.95,
        major: 0.85,
      },
      style: ThresholdStyle.PERCENTAGE,
    };
  }
}

export interface ArcaneSurgeCast {
  ordinal: number;
  cast: number;
  mana?: number;
  charges: number;
  siphonStormBuff: boolean;
  netherPrecision: boolean;
}
