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
 * Gets current mana percentage from a cast event.
 * @param event The cast event to extract mana from
 * @returns Mana percentage or undefined if not available
 */
export function getManaPercentage(event: CastEvent): number | undefined {
  const resource = event.classResources?.find((r) => r.type === RESOURCE_TYPES.MANA.id);
  return resource && resource.max > 0 ? resource.amount / resource.max : undefined;
}

/**
 * Gets target health percentage from a cast or damage event.
 * @param event Cast or damage event to extract health from
 * @returns Target health percentage or undefined if not available
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
