/**
 * Shared Event Helper Functions for Mage Analyzers
 *
 * These helpers extract common patterns used across multiple analyzer files.
 * They follow the Hybrid Helpers principle: "Is it more than 1-2 lines? → Helper"
 *
 * IMPORTANT: Many of these helpers rely on CastLinkNormalizer to link events together.
 * Make sure your CombatLogParser includes the appropriate normalizer before these modules.
 */

import { CastEvent, HasTarget, HasHitpoints, GetRelatedEvents, AnyEvent } from 'parser/core/Events';
import { encodeTargetString } from 'parser/shared/modules/Enemies';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import Combatant from 'parser/core/Combatant';
import SpellUsable from 'parser/shared/modules/SpellUsable';

// =============================================================================
// RESOURCE HELPERS
// =============================================================================

/**
 * Get current mana percentage from a cast event.
 *
 * Used across: ArcaneBarrage, ArcaneSurge, ArcaneMissiles, ArcaneOrb
 *
 * @returns Mana percentage (0.0 to 1.0) or undefined if not available
 */
export function getManaPercentage(event: CastEvent): number | undefined {
  const resource = event.classResources?.find((r) => r.type === RESOURCE_TYPES.MANA.id);
  return resource ? resource.amount / resource.max : undefined;
}

/**
 * Get current value of any resource from a cast event.
 *
 * @param resourceType The resource type to check (MANA, ENERGY, etc.)
 * @returns Current resource amount or undefined
 */
export function getResourceAmount(
  event: CastEvent,
  resourceType: { id: number },
): number | undefined {
  const resource = event.classResources?.find((r) => r.type === resourceType.id);
  return resource?.amount;
}

/**
 * Get maximum value of any resource from a cast event.
 *
 * @param resourceType The resource type to check
 * @returns Maximum resource amount or undefined
 */
export function getResourceMax(event: CastEvent, resourceType: { id: number }): number | undefined {
  const resource = event.classResources?.find((r) => r.type === resourceType.id);
  return resource?.max;
}

// =============================================================================
// TARGET HELPERS
// =============================================================================

/**
 * Get target health percentage from a cast event.
 *
 * ⚠️ PREREQUISITE: Requires CastLinkNormalizer to link cast to damage events
 * The normalizer must link damage events to the cast using 'SpellDamage' relation.
 *
 * Handles complex logic of matching cast target to damage target and extracting health.
 * Used across: ArcaneBarrage, ArcaneOrb
 *
 * @returns Target health percentage (0.0 to 1.0) or undefined if not available
 */
export function getTargetHealthPercentage(event: CastEvent): number | undefined {
  // Get the target we cast at
  const castTarget = HasTarget(event) && encodeTargetString(event.targetID, event.targetInstance);
  if (!castTarget) {
    return undefined;
  }

  // Find damage events linked to this cast by CastLinkNormalizer
  const damage = GetRelatedEvents(event, 'SpellDamage');

  // Find the damage event that hit our cast target
  const targetHit = damage.find(
    (d) => HasTarget(d) && castTarget === encodeTargetString(d.targetID, d.targetInstance),
  );

  if (!targetHit || !HasTarget(targetHit) || !HasHitpoints(targetHit)) {
    return undefined;
  }

  // Verify it's the same target (paranoid check)
  const damageTarget = encodeTargetString(targetHit.targetID, targetHit.targetInstance);
  if (castTarget !== damageTarget) {
    return undefined;
  }

  return targetHit.hitPoints / targetHit.maxHitPoints;
}

/**
 * Count how many targets were hit by a spell cast.
 *
 * ⚠️ PREREQUISITE: Requires CastLinkNormalizer to link cast to damage events
 * The normalizer must link damage events using 'SpellDamage' relation.
 *
 * @returns Number of unique targets hit
 */
export function getTargetsHitCount(event: CastEvent): number {
  const damage = GetRelatedEvents(event, 'SpellDamage');
  return damage.length;
}

/**
 * Get all unique target IDs hit by a spell cast.
 *
 * ⚠️ PREREQUISITE: Requires CastLinkNormalizer to link cast to damage events
 *
 * @returns Array of encoded target strings
 */
export function getTargetsHit(event: CastEvent): string[] {
  const damage = GetRelatedEvents(event, 'SpellDamage');
  return damage
    .filter((d): d is AnyEvent & { targetID: number; targetInstance?: number } => HasTarget(d))
    .map((d) => encodeTargetString(d.targetID, d.targetInstance))
    .filter((target, index, self) => self.indexOf(target) === index); // unique only
}

// =============================================================================
// BUFF HELPERS
// =============================================================================

/**
 * Get the number of stacks for a buff on a combatant.
 *
 * Used across: ArcaneBarrage (Nether Precision), many other files
 *
 * @returns Number of stacks (0 if buff not active)
 */
export function getBuffStacks(combatant: Combatant, buffId: number): number {
  const buff = combatant.getBuff(buffId);
  return buff ? buff.stacks || 0 : 0;
}

/**
 * Check if a combatant has any of several buffs active.
 *
 * @returns true if any of the specified buffs are active
 */
export function hasAnyBuff(combatant: Combatant, buffIds: number[], timestamp?: number): boolean {
  return buffIds.some((id) => combatant.hasBuff(id, timestamp));
}

/**
 * Check if a combatant has all of several buffs active.
 *
 * @returns true only if ALL specified buffs are active
 */
export function hasAllBuffs(combatant: Combatant, buffIds: number[], timestamp?: number): boolean {
  return buffIds.every((id) => combatant.hasBuff(id, timestamp));
}

/**
 * Get remaining duration of a buff in milliseconds.
 *
 * @returns Milliseconds remaining, or undefined if buff not active
 */
export function getBuffRemainingDuration(
  combatant: Combatant,
  buffId: number,
  currentTimestamp: number,
): number | undefined {
  const buff = combatant.getBuff(buffId);
  if (!buff || buff.end === null) {
    return undefined;
  }
  return buff.end - currentTimestamp;
}

// =============================================================================
// COOLDOWN HELPERS
// =============================================================================

/**
 * Get remaining cooldown for a spell in milliseconds.
 *
 * Used across: ArcaneBarrage (Touch CD), many other files
 *
 * @returns Milliseconds remaining on cooldown (0 if available)
 */
export function getCooldownRemaining(spellUsable: SpellUsable, spellId: number): number {
  return spellUsable.cooldownRemaining(spellId);
}

/**
 * Check if a spell is off cooldown and available to cast.
 *
 * @returns true if spell can be cast now
 */
export function isSpellAvailable(spellUsable: SpellUsable, spellId: number): boolean {
  return spellUsable.isAvailable(spellId);
}

/**
 * Check if a spell is on cooldown.
 *
 * @returns true if spell is on cooldown (cannot be cast)
 */
export function isSpellOnCooldown(spellUsable: SpellUsable, spellId: number): boolean {
  return spellUsable.isOnCooldown(spellId);
}

// =============================================================================
// FIGHT CONTEXT HELPERS
// =============================================================================

/**
 * Check if an event happened during the opener (first 20 seconds).
 *
 * @param eventTimestamp When the event occurred
 * @param fightStartTime When the fight started
 * @param openerDuration How long opener lasts (default 20s)
 * @returns true if event was during opener
 */
export function isDuringOpener(
  eventTimestamp: number,
  fightStartTime: number,
  openerDuration = 20000,
): boolean {
  return eventTimestamp - fightStartTime < openerDuration;
}

/**
 * Check if an event happened near the end of a fight.
 *
 * @param eventTimestamp When the event occurred
 * @param fightEndTime When the fight ended
 * @param threshold How many milliseconds before end counts as "near end" (default 60s)
 * @returns true if event was near fight end
 */
export function isNearFightEnd(
  eventTimestamp: number,
  fightEndTime: number,
  threshold = 60000,
): boolean {
  return fightEndTime - eventTimestamp < threshold;
}

/**
 * Get how much time is remaining in the fight.
 *
 * @returns Milliseconds remaining in fight
 */
export function getFightTimeRemaining(eventTimestamp: number, fightEndTime: number): number {
  return fightEndTime - eventTimestamp;
}
