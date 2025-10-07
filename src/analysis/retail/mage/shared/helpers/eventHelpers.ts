import {
  CastEvent,
  DamageEvent,
  HasTarget,
  HasHitpoints,
  GetRelatedEvents,
} from 'parser/core/Events';
import { encodeTargetString } from 'parser/shared/modules/Enemies';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';

/**
 * Get current mana percentage from a cast event.
 *
 * Used across: ArcaneBarrage, ArcaneSurge, ArcaneMissiles, ArcaneOrb
 *
 * @returns Mana percentage (0.0 to 1.0) or undefined if not available
 */
export function getManaPercentage(event: CastEvent): number | undefined {
  const resource = event.classResources?.find((r) => r.type === RESOURCE_TYPES.MANA.id);
  return resource && resource.max > 0 ? resource.amount / resource.max : undefined;
}

/**
 * Get target health percentage from a cast or damage event.
 *
 * For CastEvent: Requires CastLinkNormalizer to link cast to damage events.
 * The normalizer must link damage events to the cast using 'SpellDamage' relation.
 *
 * For DamageEvent: Directly extracts hitPoints if available.
 *
 * Handles complex logic of matching cast target to damage target and extracting health.
 * Used across: ArcaneBarrage, ArcaneOrb, ArcaneBombardment
 *
 * @param event CastEvent or DamageEvent to extract health from
 * @returns Target health percentage (0.0 to 1.0) or undefined if not available
 */
export function getTargetHealthPercentage(event: CastEvent | DamageEvent): number | undefined {
  if (event.type === 'damage') {
    if (!HasHitpoints(event)) {
      return undefined;
    }
    return event.hitPoints / event.maxHitPoints;
  }

  const castTarget = HasTarget(event) && encodeTargetString(event.targetID, event.targetInstance);
  if (!castTarget) {
    return undefined;
  }

  const damage = GetRelatedEvents(event, 'SpellDamage');

  const targetHit = damage.find(
    (d) => HasTarget(d) && castTarget === encodeTargetString(d.targetID, d.targetInstance),
  );

  if (!targetHit || !HasTarget(targetHit) || !HasHitpoints(targetHit)) {
    return undefined;
  }

  const damageTarget = encodeTargetString(targetHit.targetID, targetHit.targetInstance);
  if (castTarget !== damageTarget) {
    return undefined;
  }

  return targetHit.hitPoints / targetHit.maxHitPoints;
}
