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
import { createEventLinks, link } from 'analysis/retail/mage/shared/helpers/castLinkHelpers';

/**
 * Arcane Mage Cast Link Normalizer
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
 * - Use link() helper: link(EventType.Damage, { forwardBuffer: 2000, anyTarget: true })
 * - For custom relations: link('myCustomRelation', { type: EventType.Cast, id: SPELL.id })
 * - Set forwardBuffer to match spell duration for removeBuff/removeDebuff
 * - Use maxLinks to limit number of linked events (e.g., maxLinks: 1 for single-target abilities)
 * - Set anyTarget: true for AoE abilities that hit multiple targets
 * - Add condition functions for complex filtering logic
 */

const CustomType = {
  PRECAST: 'precast',
  CONSUME: 'consume',
  TICK: 'tick',
  BARRAGE_CAST: 'barrageCast',
  REFUND_BUFF: 'refundBuff',
};

const EVENT_LINKS = createEventLinks(
  {
    spell: SPELLS.ARCANE_EXPLOSION.id,
    parentType: EventType.Cast,
    links: [link(EventType.Damage, { anyTarget: true })],
  },

  {
    spell: SPELLS.ARCANE_BARRAGE.id,
    parentType: EventType.Cast,
    links: [
      link(EventType.Damage, { forwardBuffer: 2000, anyTarget: true }), // Barrage projectile travel time
      link(CustomType.PRECAST, {
        id: [SPELLS.ARCANE_BLAST.id, TALENTS.ARCANE_SURGE_TALENT.id],
        anyTarget: true,
        type: EventType.Cast,
      }),
    ],
  },

  {
    spell: TALENTS.ARCANE_MISSILES_TALENT.id,
    parentType: EventType.Cast,
    links: [
      link(EventType.Damage, {
        id: SPELLS.ARCANE_MISSILES_DAMAGE.id,
        forwardBuffer: 2600,
        maxLinks: 8,
        anyTarget: true,
      }),
    ],
  },

  {
    spell: SPELLS.ARCANE_ORB.id,
    parentType: EventType.Cast,
    links: [
      link(EventType.Damage, {
        id: SPELLS.ARCANE_ORB_DAMAGE.id,
        forwardBuffer: 2500,
        anyTarget: true,
        condition: (linking, referenced) => !HasRelatedEvent(referenced, EventType.Cast),
      }),
      link(EventType.ResourceChange, { anyTarget: true }),
    ],
  },

  {
    spell: TALENTS.ARCANE_SURGE_TALENT.id,
    parentType: EventType.Cast,
    links: [link(EventType.Damage, { maxLinks: 1, anyTarget: true })],
  },

  {
    spell: TALENTS.TOUCH_OF_THE_MAGI_TALENT.id,
    parentType: EventType.Cast,
    links: [
      link(EventType.ApplyDebuff, {
        id: SPELLS.TOUCH_OF_THE_MAGI_DEBUFF.id,
        maxLinks: 1,
        anyTarget: true,
      }),
      link(EventType.RemoveDebuff, {
        id: SPELLS.TOUCH_OF_THE_MAGI_DEBUFF.id,
        forwardBuffer: 14000,
        maxLinks: 1,
        anyTarget: true,
      }),
      link(EventType.Damage, {
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
      link(EventType.RemoveDebuff, { forwardBuffer: 15000, maxLinks: 1, anyTarget: true }),
      link(EventType.ResourceChange, { id: TALENTS.TOUCH_OF_THE_MAGI_TALENT.id, anyTarget: true }),
      {
        relation: CustomType.REFUND_BUFF,
        type: EventType.RemoveBuff,
        id: [SPELLS.BURDEN_OF_POWER_BUFF.id, SPELLS.GLORIOUS_INCANDESCENCE_BUFF.id],
        maxLinks: 1,
        anyTarget: true,
        backwardBuffer: 500,
      },
      {
        relation: EventType.Damage,
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
          const debuffEnd = GetRelatedEvent(linkingEvent, EventType.RemoveDebuff);
          return debuffEnd ? referencedEvent.timestamp < debuffEnd.timestamp : false;
        },
      },
    ],
  },

  {
    spell: SPELLS.CLEARCASTING_ARCANE.id,
    parentType: [EventType.ApplyBuff, EventType.ApplyBuffStack],
    reverseRelation: EventType.ApplyBuff,
    links: [
      link(EventType.RemoveBuff, {
        forwardBuffer: 21000,
        maxLinks: 1,
        anyTarget: true,
        condition: (linking, referenced) => !HasRelatedEvent(referenced, EventType.ApplyBuff),
      }),
      link(CustomType.CONSUME, {
        id: TALENTS.ARCANE_MISSILES_TALENT.id,
        forwardBuffer: 21000,
        maxLinks: 1,
        anyTarget: true,
        type: EventType.Cast,
        condition: (linking, referenced) => !HasRelatedEvent(referenced, EventType.Cast),
      }),
    ],
  },

  {
    spell: TALENTS.PRESENCE_OF_MIND_TALENT.id,
    parentType: EventType.Cast,
    links: [
      link(EventType.ApplyBuff),
      link(CustomType.CONSUME, {
        id: SPELLS.ARCANE_BLAST.id,
        maxLinks: 2,
        anyTarget: true,
        forwardBuffer: 15000,
        type: EventType.Cast,
      }),
      link(EventType.RemoveBuff, { forwardBuffer: 15000, maxLinks: 1, anyTarget: true }),
      {
        relation: CustomType.BARRAGE_CAST,
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
      link(EventType.RemoveDebuff, {
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
      link(CustomType.CONSUME, {
        id: [SPELLS.ARCANE_BLAST.id, SPELLS.ARCANE_BARRAGE.id],
        maxLinks: 1,
        anyTarget: true,
        type: EventType.Cast,
      }),
    ],
  },

  {
    spell: SPELLS.SIPHON_STORM_BUFF.id,
    parentType: EventType.ApplyBuff,
    links: [
      link(EventType.RemoveBuff, { forwardBuffer: 25000, maxLinks: 1, anyTarget: true }),
      link(EventType.Damage, {
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
  return GetRelatedEvents(aoeCastEvent, EventType.Damage).length;
}

export default CastLinkNormalizer;
