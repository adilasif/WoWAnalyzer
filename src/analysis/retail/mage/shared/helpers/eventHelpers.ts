/**
 * Shared Event Helper Functions for Mage Analyzers
 *
 * These helpers extract common patterns used across multiple analyzer files.
 * They follow the Hybrid Helpers principle: "Is it more than 1-2 lines? → Helper"
 *
 * IMPORTANT: Many of these helpers rely on CastLinkNormalizer to link events together.
 * Make sure your CombatLogParser includes the appropriate normalizer before these modules.
 *
 * NOTE: Buff/Cooldown/Event helpers have been moved to MageAnalyzer base class.
 * Use this.getBuffStacks(), this.getCooldownRemaining(), this.getCastsInTimeWindow(), etc.
 */

import { CastEvent, HasTarget, HasHitpoints, GetRelatedEvents, AnyEvent } from 'parser/core/Events';
import { encodeTargetString } from 'parser/shared/modules/Enemies';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';

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
