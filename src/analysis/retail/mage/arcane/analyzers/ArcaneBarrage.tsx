/**
 * Arcane Barrage Analyzer
 *
 * Tracks Arcane Barrage casts with comprehensive context data for
 * performance evaluation in guides.
 *
 * Events tracked:
 * - Arcane Barrage casts (main data collection)
 * - Arcane Tempo buff applications (for timing calculations)
 *
 * Data collected:
 * - Mana percentage, Arcane Charges, buff states
 * - Cooldown status, target information, damage events
 * - Tempo timing, Nether Precision stacks
 */

import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  CastEvent,
  ApplyBuffEvent,
  ApplyBuffStackEvent,
  RefreshBuffEvent,
  GetRelatedEvents,
  GetRelatedEvent,
} from 'parser/core/Events';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import ArcaneChargeTracker from './ArcaneChargeTracker';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import {
  getManaPercentage,
  getBuffStacks,
  getCooldownRemaining,
  getTargetHealthPercentage,
} from '../../shared/helpers';

const TEMPO_DURATION = 12000;

export default class ArcaneBarrage extends Analyzer {
  static dependencies = {
    arcaneChargeTracker: ArcaneChargeTracker,
    spellUsable: SpellUsable,
  };

  protected arcaneChargeTracker!: ArcaneChargeTracker;
  protected spellUsable!: SpellUsable;

  barrageCasts: ArcaneBarrageCast[] = [];
  private lastTempoApply = 0;

  constructor(options: Options) {
    super(options);
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_TEMPO_BUFF),
      this.onTempo,
    );
    this.addEventListener(
      Events.applybuffstack.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_TEMPO_BUFF),
      this.onTempo,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_TEMPO_BUFF),
      this.onTempo,
    );
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_BARRAGE),
      this.onBarrage,
    );
  }

  onTempo(event: ApplyBuffEvent | ApplyBuffStackEvent | RefreshBuffEvent) {
    this.lastTempoApply = event.timestamp;
  }

  onBarrage(event: CastEvent) {
    const tempoData = this.getTempoData(event);

    this.barrageCasts.push({
      cast: event,
      // Simple inline values
      mana: getManaPercentage(event), // ✅ Shared helper
      charges: this.arcaneChargeTracker.current,
      precast: GetRelatedEvent(event, 'SpellPrecast'),
      targetsHit: GetRelatedEvents(event, 'SpellDamage').length || 0,
      clearcasting: this.selectedCombatant.hasBuff(
        SPELLS.CLEARCASTING_ARCANE.id,
        event.timestamp - 10,
      ),
      arcaneSoul: this.selectedCombatant.hasBuff(SPELLS.ARCANE_SOUL_BUFF.id),
      burdenOfPower: this.selectedCombatant.hasBuff(SPELLS.BURDEN_OF_POWER_BUFF.id),
      gloriousIncandescence: this.selectedCombatant.hasBuff(
        TALENTS.GLORIOUS_INCANDESCENCE_TALENT.id,
      ),
      intuition: this.selectedCombatant.hasBuff(SPELLS.INTUITION_BUFF.id),
      arcaneOrbAvail: this.spellUsable.isAvailable(SPELLS.ARCANE_ORB.id),
      // Complex values from shared helpers
      netherPrecisionStacks: getBuffStacks(this.selectedCombatant, SPELLS.NETHER_PRECISION_BUFF.id), // ✅ Shared helper
      touchCD: getCooldownRemaining(this.spellUsable, TALENTS.TOUCH_OF_THE_MAGI_TALENT.id), // ✅ Shared helper
      tempoRemaining: tempoData.remaining,
      health: getTargetHealthPercentage(event), // ✅ Shared helper
    });

    this.arcaneChargeTracker.clearCharges(event);
  }

  // =================================================================
  // HELPER METHODS
  // =================================================================

  /**
   * Get Arcane Tempo remaining duration.
   * This is specific to ArcaneBarrage because it tracks lastTempoApply internally.
   */
  private getTempoData(event: CastEvent): { remaining: number | undefined } {
    const hasTempo = this.selectedCombatant.hasBuff(SPELLS.ARCANE_TEMPO_BUFF.id);
    return {
      remaining: hasTempo ? TEMPO_DURATION - (event.timestamp - this.lastTempoApply) : undefined,
    };
  }

  get data() {
    return this.barrageCasts;
  }
}

export interface ArcaneBarrageCast {
  cast: CastEvent;
  mana?: number;
  charges: number;
  precast?: CastEvent;
  targetsHit: number;
  clearcasting: boolean;
  arcaneSoul: boolean;
  burdenOfPower: boolean;
  gloriousIncandescence: boolean;
  intuition: boolean;
  arcaneOrbAvail: boolean;
  netherPrecisionStacks: number;
  touchCD: number;
  tempoRemaining?: number;
  health?: number;
}
