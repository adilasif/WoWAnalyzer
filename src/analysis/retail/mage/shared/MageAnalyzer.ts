import Analyzer from 'parser/core/Analyzer';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import EventHistory from 'parser/shared/modules/EventHistory';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import Enemies from 'parser/shared/modules/Enemies';
import { CastEvent, EventType } from 'parser/core/Events';

/**
 * Base analyzer class for Mage specs with common helper methods.
 * Extends the standard Analyzer with mage-specific utilities for checking buffs,
 * cooldowns, and other common patterns.
 *
 * All helper methods automatically access the required dependencies (selectedCombatant,
 * spellUsable, abilityTracker, enemies, etc.) so you don't need to pass them manually.
 *
 * @example
 * class MyAnalyzer extends MageAnalyzer {
 *   onCast(event: CastEvent) {
 *     const stacks = this.getBuffStacks(SPELLS.NETHER_PRECISION_BUFF.id);
 *     const cd = this.getCooldownRemaining(TALENTS.TOUCH_OF_THE_MAGI_TALENT.id);
 *     const casts = this.abilityTracker.getAbility(SPELLS.FIREBALL.id).casts;
 *   }
 * }
 */
export default class MageAnalyzer extends Analyzer {
  static dependencies = {
    ...Analyzer.dependencies,
    spellUsable: SpellUsable,
    eventHistory: EventHistory,
    abilityTracker: AbilityTracker,
    enemies: Enemies,
  };

  protected spellUsable!: SpellUsable;
  protected eventHistory!: EventHistory;
  protected abilityTracker!: AbilityTracker;
  protected enemies!: Enemies;

  // =============================================================================
  // BUFF HELPERS
  // =============================================================================

  /**
   * Get the current stack count of a buff.
   * @param buffId The spell ID of the buff to check
   * @returns Number of stacks (0 if buff is not active)
   *
   * @example
   * const netherStacks = this.getBuffStacks(SPELLS.NETHER_PRECISION_BUFF.id);
   */
  getBuffStacks(buffId: number): number {
    const buff = this.selectedCombatant.getBuff(buffId);
    return buff?.stacks ?? 0;
  }

  /**
   * Check if the player has at least one of the specified buffs active.
   * @param buffIds Array of spell IDs to check
   * @param timestamp Optional timestamp to check at (defaults to current)
   * @returns true if any of the buffs are active
   *
   * @example
   * const hasProc = this.hasAnyBuff([SPELLS.PROC1.id, SPELLS.PROC2.id]);
   */
  hasAnyBuff(buffIds: number[], timestamp?: number): boolean {
    return buffIds.some((id) => this.selectedCombatant.hasBuff(id, timestamp));
  }

  /**
   * Check if the player has ALL of the specified buffs active.
   * @param buffIds Array of spell IDs to check
   * @param timestamp Optional timestamp to check at (defaults to current)
   * @returns true only if all buffs are active
   *
   * @example
   * const hasAllBuffs = this.hasAllBuffs([SPELLS.BUFF1.id, SPELLS.BUFF2.id]);
   */
  hasAllBuffs(buffIds: number[], timestamp?: number): boolean {
    return buffIds.every((id) => this.selectedCombatant.hasBuff(id, timestamp));
  }

  /**
   * Get the remaining duration of a buff in milliseconds.
   * @param buffId The spell ID of the buff
   * @param timestamp The timestamp to check at
   * @returns Milliseconds remaining, or undefined if buff is not active
   *
   * @example
   * const tempoRemaining = this.getBuffRemainingDuration(SPELLS.ARCANE_TEMPO.id, event.timestamp);
   */
  getBuffRemainingDuration(buffId: number, timestamp: number): number | undefined {
    const buff = this.selectedCombatant.getBuff(buffId, timestamp);
    if (!buff || !buff.end) {
      return undefined;
    }
    return buff.end - timestamp;
  }

  /**
   * Check if a stacking buff is at maximum stacks.
   * @param buffId The spell ID of the buff
   * @param maxStacks The maximum number of stacks for this buff
   * @returns true if buff is at or above max stacks
   *
   * @example
   * const isCapped = this.isBuffCapped(SPELLS.CLEARCASTING_ARCANE.id, 3);
   */
  isBuffCapped(buffId: number, maxStacks: number): boolean {
    return this.getBuffStacks(buffId) >= maxStacks;
  }

  // =============================================================================
  // COOLDOWN HELPERS
  // =============================================================================

  /**
   * Get remaining cooldown for a spell in milliseconds.
   * @param spellId The spell ID to check
   * @returns Milliseconds remaining on cooldown (0 if available)
   *
   * @example
   * const touchCD = this.getCooldownRemaining(TALENTS.TOUCH_OF_THE_MAGI_TALENT.id);
   */
  getCooldownRemaining(spellId: number): number {
    return this.spellUsable.cooldownRemaining(spellId);
  }

  /**
   * Check if a spell is off cooldown and available to cast.
   * @param spellId The spell ID to check
   * @returns true if spell can be cast now
   *
   * @example
   * const canCast = this.isSpellAvailable(SPELLS.ARCANE_ORB.id);
   */
  isSpellAvailable(spellId: number): boolean {
    return this.spellUsable.isAvailable(spellId);
  }

  /**
   * Check if a spell is on cooldown.
   * @param spellId The spell ID to check
   * @returns true if spell is on cooldown (cannot be cast)
   *
   * @example
   * const onCD = this.isSpellOnCooldown(TALENTS.ARCANE_SURGE_TALENT.id);
   */
  isSpellOnCooldown(spellId: number): boolean {
    return this.spellUsable.isOnCooldown(spellId);
  }

  // =============================================================================
  // EVENT HELPERS
  // =============================================================================

  /**
   * Get all casts within a time window around a specific timestamp.
   * Automatically accesses EventHistory from the analyzer's owner.
   *
   * @param config Configuration for the time window
   * @returns Array of cast events in the time window
   *
   * @example
   * const casts = this.getCastsInTimeWindow({
   *   timestamp: event.timestamp,
   *   beforeMs: 5000,
   *   afterMs: 5000,
   *   spellId: SPELLS.ARCANE_BLAST.id
   * });
   */
  getCastsInTimeWindow(config: {
    timestamp: number;
    beforeMs?: number;
    afterMs?: number;
    spellId?: number;
  }): CastEvent[] {
    const { timestamp, beforeMs = 0, afterMs = 0, spellId } = config;
    const windowStart = timestamp - beforeMs;
    const windowEnd = timestamp + afterMs;

    const events = this.eventHistory.getEvents(EventType.Cast, {
      searchBackwards: false,
      startTimestamp: windowStart,
      duration: windowEnd - windowStart,
    }) as CastEvent[];

    if (spellId) {
      return events.filter((cast) => cast.ability.guid === spellId);
    }

    return events;
  }
}
