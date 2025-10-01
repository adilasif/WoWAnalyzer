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
  HasTarget,
  HasHitpoints,
} from 'parser/core/Events';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import ArcaneChargeTracker from './ArcaneChargeTracker';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import { encodeTargetString } from 'parser/shared/modules/Enemies';

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
    const netherData = this.getNetherPrecisionData();
    const tempoData = this.getTempoData(event);
    const targetData = this.getTargetData(event);

    this.barrageCasts.push({
      cast: event,
      // Simple inline values
      mana: this.getMana(event),
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
      // Complex values from helpers
      netherPrecisionStacks: netherData.stacks,
      touchCD: this.getTouchCooldown(),
      tempoRemaining: tempoData.remaining,
      health: targetData.health,
    });

    this.arcaneChargeTracker.clearCharges(event);
  }

  // =================================================================
  // HELPER METHODS (Only for complex logic)
  // =================================================================

  /**
   * Get current mana percentage.
   * HELPER REASON: Needs to find resource in array and do calculation.
   */
  private getMana(event: CastEvent): number | undefined {
    const resource = event.classResources?.find((r) => r.type === RESOURCE_TYPES.MANA.id);
    return resource ? resource.amount / resource.max : undefined;
  }

  /**
   * Get Nether Precision buff stacks.
   * HELPER REASON: Needs to check buff existence and get stacks.
   */
  private getNetherPrecisionData(): { stacks: number } {
    const buff = this.selectedCombatant.getBuff(SPELLS.NETHER_PRECISION_BUFF.id);
    return {
      stacks: buff ? buff.stacks || 0 : 0,
    };
  }

  /**
   * Get Arcane Tempo remaining duration.
   * HELPER REASON: Needs buff check and time calculation.
   */
  private getTempoData(event: CastEvent): { remaining: number | undefined } {
    const hasTempo = this.selectedCombatant.hasBuff(SPELLS.ARCANE_TEMPO_BUFF.id);
    return {
      remaining: hasTempo ? TEMPO_DURATION - (event.timestamp - this.lastTempoApply) : undefined,
    };
  }

  /**
   * Get target health percentage.
   * HELPER REASON: Complex logic with multiple null checks and target matching.
   */
  private getTargetData(event: CastEvent): { health: number | undefined } {
    const castTarget = HasTarget(event) && encodeTargetString(event.targetID, event.targetInstance);
    const damage = GetRelatedEvents(event, 'SpellDamage');
    const targetHit = damage.find(
      (d) => HasTarget(d) && castTarget === encodeTargetString(d.targetID, d.targetInstance),
    );
    const damageTarget =
      targetHit &&
      HasTarget(targetHit) &&
      encodeTargetString(targetHit.targetID, targetHit.targetInstance);
    const healthPercent =
      targetHit &&
      castTarget === damageTarget &&
      HasHitpoints(targetHit) &&
      targetHit.hitPoints / targetHit.maxHitPoints;

    return {
      health: healthPercent || undefined,
    };
  }

  /**
   * Get remaining cooldown for Touch of the Magi.
   * HELPER REASON: Uses SpellUsable API.
   */
  private getTouchCooldown(): number {
    return this.spellUsable.cooldownRemaining(TALENTS.TOUCH_OF_THE_MAGI_TALENT.id);
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
