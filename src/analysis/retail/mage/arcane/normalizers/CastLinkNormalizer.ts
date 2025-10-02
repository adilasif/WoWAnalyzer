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

const EVENT_LINKS = createEventLinks(
  // ============================================================================
  // CORE DAMAGE SPELLS
  // ============================================================================
  {
    id: SPELLS.ARCANE_EXPLOSION.id,
    type: EventType.Cast,
    links: [LinkPatterns.damage({ anyTarget: true })],
  },

  {
    id: SPELLS.ARCANE_BARRAGE.id,
    type: EventType.Cast,
    links: [
      LinkPatterns.damage({ forwardBuffer: 2000, anyTarget: true }), // Barrage projectile travel time
      LinkPatterns.preCast({
        id: [SPELLS.ARCANE_BLAST.id, TALENTS.ARCANE_SURGE_TALENT.id],
        anyTarget: true,
      }),
    ],
  },

  {
    id: TALENTS.SUPERNOVA_TALENT.id,
    type: EventType.Cast,
    links: [LinkPatterns.damage({ forwardBuffer: 2000, anyTarget: true })],
  },

  // ============================================================================
  // CHANNELED SPELLS
  // ============================================================================
  {
    id: TALENTS.ARCANE_MISSILES_TALENT.id,
    type: EventType.Cast,
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
    id: TALENTS.SHIFTING_POWER_TALENT.id,
    type: EventType.Cast,
    links: [
      LinkPatterns.cast({
        id: SPELLS.SHIFTING_POWER_TICK.id,
        forwardBuffer: 5000,
        anyTarget: true,
      }),
    ],
  },

  // ============================================================================
  // ARCANE ORB
  // ============================================================================
  {
    id: SPELLS.ARCANE_ORB.id,
    type: EventType.Cast,
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

  // ============================================================================
  // MAJOR COOLDOWNS - ARCANE SURGE
  // ============================================================================
  {
    id: TALENTS.ARCANE_SURGE_TALENT.id,
    type: EventType.Cast,
    links: [LinkPatterns.damage({ maxLinks: 1, anyTarget: true })],
  },

  // ============================================================================
  // MAJOR COOLDOWNS - TOUCH OF THE MAGI
  // ============================================================================
  {
    id: TALENTS.TOUCH_OF_THE_MAGI_TALENT.id,
    type: EventType.Cast,
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
      }), // Arcane Echo during TotM
    ],
  },

  {
    id: SPELLS.TOUCH_OF_THE_MAGI_DEBUFF.id,
    type: EventType.ApplyDebuff,
    links: [
      LinkPatterns.removeDebuff({ forwardBuffer: 15000, maxLinks: 1, anyTarget: true }),
      LinkPatterns.energize({ id: TALENTS.TOUCH_OF_THE_MAGI_TALENT.id, anyTarget: true }),
      {
        // Charge refund when TotM is applied
        relation: 'RefundBuff',
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
        // Track all damage during TotM window
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

  // ============================================================================
  // PROC BUFFS - CLEARCASTING
  // ============================================================================
  {
    id: SPELLS.CLEARCASTING_ARCANE.id,
    type: [EventType.ApplyBuff, EventType.ApplyBuffStack],
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

  // ============================================================================
  // PROC BUFFS - NETHER PRECISION
  // ============================================================================
  {
    id: SPELLS.NETHER_PRECISION_BUFF.id,
    type: EventType.ApplyBuff,
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
    id: SPELLS.NETHER_PRECISION_BUFF.id,
    type: EventType.RefreshBuff,
    links: [LinkPatterns.removeBuff({ forwardBuffer: 11000, maxLinks: 1, anyTarget: true })],
  },

  // ============================================================================
  // COOLDOWNS - PRESENCE OF MIND
  // ============================================================================
  {
    id: TALENTS.PRESENCE_OF_MIND_TALENT.id,
    type: EventType.Cast,
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
        // Next Barrage after PoM (for checking PoM → Barrage efficiency)
        relation: 'BarrageCast',
        type: EventType.Cast,
        id: SPELLS.ARCANE_BARRAGE.id,
        maxLinks: 1,
        anyTarget: true,
        forwardBuffer: 60000, // We don't know when next barrage is, check 1 min ahead
      },
    ],
  },

  {
    id: TALENTS.PRESENCE_OF_MIND_TALENT.id,
    type: EventType.RemoveBuff,
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

  // ============================================================================
  // TALENT BUFFS
  // ============================================================================
  {
    id: SPELLS.BURDEN_OF_POWER_BUFF.id,
    type: EventType.RemoveBuff,
    links: [
      LinkPatterns.consumed({
        id: [SPELLS.ARCANE_BLAST.id, SPELLS.ARCANE_BARRAGE.id],
        maxLinks: 1,
        anyTarget: true,
      }),
    ],
  },

  {
    id: SPELLS.SIPHON_STORM_BUFF.id,
    type: EventType.ApplyBuff,
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
