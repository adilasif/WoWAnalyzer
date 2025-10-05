import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import EventLinkNormalizer from 'parser/core/EventLinkNormalizer';
import {
  CastEvent,
  EventType,
  GetRelatedEvent,
  GetRelatedEvents,
  HasRelatedEvent,
} from 'parser/core/Events';
import { Options } from 'parser/core/Module';
import {
  createEventLinks,
  LinkPatterns,
  EventRelations,
} from 'analysis/retail/mage/shared/helpers/castLinkHelpers';

/**
 * Arcane Mage Cast Link Normalizer
 *
 * Links related events together (e.g., cast → damage, buff apply → buff remove)
 * for easier analysis in spec modules.
 *
 * DEFAULTS (can be overridden per-link):
 * - forwardBuffer: 75ms (CAST_BUFFER_MS)
 * - backwardBuffer: 75ms (CAST_BUFFER_MS)
 * - maxLinks: unlimited
 * - anyTarget: false (links only to same target)
 * - anySource: false (links only to same source)
 * - id: parent spell ID (auto-matches same spell)
 * - reverseRelation: 'auto' (creates bidirectional link using parent EventType)
 *
 * USAGE:
 * - Use LinkPatterns helpers for common patterns (damage, applyBuff, removeBuff, etc.)
 * - Override defaults by spreading: LinkPatterns.damage({ forwardBuffer: 2000, anyTarget: true })
 * - Set forwardBuffer to match spell duration for removeBuff/removeDebuff
 * - Use maxLinks to limit number of linked events (e.g., maxLinks: 1 for single-target abilities)
 * - Set anyTarget: true for AoE abilities that hit multiple targets
 * - Add condition functions for complex filtering logic
 */

const EVENT_LINKS = createEventLinks(
  {
    spell: SPELLS.ARCANE_EXPLOSION.id,
    parentType: EventType.Cast,
    links: [LinkPatterns.damage({ anyTarget: true })],
  },

  {
    spell: SPELLS.ARCANE_BARRAGE.id,
    parentType: EventType.Cast,
    links: [
      LinkPatterns.damage({ forwardBuffer: 2000, anyTarget: true }), // Barrage projectile travel time
      LinkPatterns.preCast({
        id: [SPELLS.ARCANE_BLAST.id, TALENTS.ARCANE_SURGE_TALENT.id],
        anyTarget: true,
      }),
    ],
  },

  {
    spell: TALENTS.SUPERNOVA_TALENT.id,
    parentType: EventType.Cast,
    links: [LinkPatterns.damage({ forwardBuffer: 2000, anyTarget: true })],
  },

  {
    spell: TALENTS.ARCANE_MISSILES_TALENT.id,
    parentType: EventType.Cast,
    links: [
      LinkPatterns.damage({
        id: SPELLS.ARCANE_MISSILES_DAMAGE.id,
        forwardBuffer: 2600,
        maxLinks: 8,
        anyTarget: true,
      }),
    ],
  },

  {
    spell: TALENTS.SHIFTING_POWER_TALENT.id,
    parentType: EventType.Cast,
    links: [
      LinkPatterns.cast({
        id: SPELLS.SHIFTING_POWER_TICK.id,
        relation: EventRelations.TICK,
        forwardBuffer: 5000,
        anyTarget: true,
      }),
    ],
  },

  {
    spell: SPELLS.ARCANE_ORB.id,
    parentType: EventType.Cast,
    links: [
      LinkPatterns.damage({
        id: SPELLS.ARCANE_ORB_DAMAGE.id,
        forwardBuffer: 2500,
        anyTarget: true,
        condition: (linking, referenced) => !HasRelatedEvent(referenced, EventRelations.CAST),
      }),
      LinkPatterns.energize({ anyTarget: true }),
    ],
  },

  {
    spell: TALENTS.ARCANE_SURGE_TALENT.id,
    parentType: EventType.Cast,
    links: [LinkPatterns.damage({ maxLinks: 1, anyTarget: true })],
  },

  {
    spell: TALENTS.TOUCH_OF_THE_MAGI_TALENT.id,
    parentType: EventType.Cast,
    links: [
      LinkPatterns.applyDebuff({
        id: SPELLS.TOUCH_OF_THE_MAGI_DEBUFF.id,
        maxLinks: 1,
        anyTarget: true,
      }),
      LinkPatterns.removeDebuff({
        id: SPELLS.TOUCH_OF_THE_MAGI_DEBUFF.id,
        forwardBuffer: 14000,
        maxLinks: 1,
        anyTarget: true,
      }),
      LinkPatterns.damage({
        id: SPELLS.ARCANE_ECHO_DAMAGE.id,
        forwardBuffer: 14000,
        anyTarget: true,
      }),
    ],
  },

  {
    spell: SPELLS.TOUCH_OF_THE_MAGI_DEBUFF.id,
    parentType: EventType.ApplyDebuff,
    links: [
      LinkPatterns.removeDebuff({ forwardBuffer: 15000, maxLinks: 1, anyTarget: true }),
      LinkPatterns.energize({ id: TALENTS.TOUCH_OF_THE_MAGI_TALENT.id, anyTarget: true }),
      {
        relation: EventRelations.REFUND_BUFF,
        type: EventType.RemoveBuff,
        id: [
          SPELLS.BURDEN_OF_POWER_BUFF.id,
          SPELLS.INTUITION_BUFF.id,
          SPELLS.GLORIOUS_INCANDESCENCE_BUFF.id,
        ],
        maxLinks: 1,
        anyTarget: true,
        backwardBuffer: 500,
      },
      {
        relation: EventRelations.DAMAGE,
        type: EventType.Damage,
        id: [
          SPELLS.ARCANE_BLAST.id,
          SPELLS.ARCANE_MISSILES_DAMAGE.id,
          SPELLS.ARCANE_BARRAGE.id,
          SPELLS.ARCANE_EXPLOSION.id,
        ],
        anyTarget: true,
        forwardBuffer: 15000,
        condition: (linkingEvent, referencedEvent) => {
          const debuffEnd = GetRelatedEvent(linkingEvent, EventRelations.REMOVE_DEBUFF);
          return debuffEnd ? referencedEvent.timestamp < debuffEnd.timestamp : false;
        },
      },
    ],
  },

  {
    spell: SPELLS.CLEARCASTING_ARCANE.id,
    parentType: [EventType.ApplyBuff, EventType.ApplyBuffStack],
    reverseRelation: EventRelations.APPLY_BUFF,
    links: [
      LinkPatterns.removeBuff({
        forwardBuffer: 21000,
        maxLinks: 1,
        anyTarget: true,
        condition: (linking, referenced) => !HasRelatedEvent(referenced, EventRelations.APPLY_BUFF),
      }),
      LinkPatterns.consumed({
        id: TALENTS.ARCANE_MISSILES_TALENT.id,
        forwardBuffer: 21000,
        maxLinks: 1,
        anyTarget: true,
        condition: (linking, referenced) => !HasRelatedEvent(referenced, EventRelations.CAST),
      }),
    ],
  },

  {
    spell: SPELLS.NETHER_PRECISION_BUFF.id,
    parentType: EventType.ApplyBuff,
    links: [
      LinkPatterns.removeBuff({
        type: [EventType.RemoveBuff, EventType.RefreshBuff],
        forwardBuffer: 11000,
        maxLinks: 1,
        anyTarget: true,
      }),
      LinkPatterns.damage({
        relation: EventRelations.DAMAGE, // Not from cast, just damage events
        id: [SPELLS.ARCANE_BLAST.id, SPELLS.ARCANE_BARRAGE.id],
        maxLinks: 2,
        anyTarget: true,
        forwardBuffer: 10500,
      }),
      LinkPatterns.consumed({
        id: TALENTS.ARCANE_MISSILES_TALENT.id,
        forwardBuffer: 10500,
        maxLinks: 1,
        anyTarget: true,
      }),
    ],
  },

  {
    spell: SPELLS.NETHER_PRECISION_BUFF.id,
    parentType: EventType.RefreshBuff,
    links: [LinkPatterns.removeBuff({ forwardBuffer: 11000, maxLinks: 1, anyTarget: true })],
  },

  {
    spell: TALENTS.PRESENCE_OF_MIND_TALENT.id,
    parentType: EventType.Cast,
    links: [
      LinkPatterns.applyBuff(),
      LinkPatterns.consumed({
        id: SPELLS.ARCANE_BLAST.id,
        maxLinks: 2,
        anyTarget: true,
        forwardBuffer: 15000,
      }),
      LinkPatterns.removeBuff({ forwardBuffer: 15000, maxLinks: 1, anyTarget: true }),
      {
        relation: EventRelations.BARRAGE_CAST,
        type: EventType.Cast,
        id: SPELLS.ARCANE_BARRAGE.id,
        maxLinks: 1,
        anyTarget: true,
        forwardBuffer: 60000, // We don't know when next barrage is, check 1 min ahead
      },
    ],
  },

  {
    spell: TALENTS.PRESENCE_OF_MIND_TALENT.id,
    parentType: EventType.RemoveBuff,
    links: [
      LinkPatterns.removeDebuff({
        id: SPELLS.TOUCH_OF_THE_MAGI_DEBUFF.id,
        forwardBuffer: 5000,
        backwardBuffer: 5000,
        maxLinks: 1,
        anyTarget: true,
      }),
    ],
  },

  {
    spell: SPELLS.BURDEN_OF_POWER_BUFF.id,
    parentType: EventType.RemoveBuff,
    links: [
      LinkPatterns.consumed({
        id: [SPELLS.ARCANE_BLAST.id, SPELLS.ARCANE_BARRAGE.id],
        maxLinks: 1,
        anyTarget: true,
      }),
    ],
  },

  {
    spell: SPELLS.SIPHON_STORM_BUFF.id,
    parentType: EventType.ApplyBuff,
    links: [
      LinkPatterns.removeBuff({ forwardBuffer: 25000, maxLinks: 1, anyTarget: true }),
      LinkPatterns.damage({
        id: TALENTS.ARCANE_SURGE_TALENT.id,
        maxLinks: 1,
        anyTarget: true,
        forwardBuffer: 20500,
      }),
    ],
  },
);

/**
 * Links the damage events for spells to their cast event. This allows for more
 * easily accessing the related events in spec modules instead of looking at the
 * events separately.
 */
class CastLinkNormalizer extends EventLinkNormalizer {
  combatant = this.owner.selectedCombatant;
  constructor(options: Options) {
    super(options, EVENT_LINKS);
  }
}

export function getHitCount(aoeCastEvent: CastEvent): number {
  return GetRelatedEvents(aoeCastEvent, EventRelations.DAMAGE).length;
}

export default CastLinkNormalizer;
