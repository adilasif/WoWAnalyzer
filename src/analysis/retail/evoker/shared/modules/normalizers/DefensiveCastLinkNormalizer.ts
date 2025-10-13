import { EventType } from 'parser/core/Events';
import TALENTS from 'common/TALENTS/evoker';
import SPELLS from 'common/SPELLS/evoker';
import EventLinkNormalizer, { EventLink } from 'parser/core/EventLinkNormalizer';
import { Options } from 'parser/core/Module';

export const OBSIDIAN_SCALES = 'obsidianScales'; // links cast to buff apply
export const RENEWING_BLAZE = 'renewingBlaze'; // links cast to buff apply
export const RENEWING_BLAZE_HEAL = 'renewingBlazeHeal'; // links heal buff and healing

const CAST_BUFFER = 50;
/** Heal buff can get applied immediately on use, and keeps getting refreshed on damage until
 * main acc buff runs out, so we set this high to make sure we catch all. */
const RENEWING_BLAZE_DURATION = 25_000;

const EVENT_LINKS: EventLink[] = [
  {
    linkRelation: OBSIDIAN_SCALES,
    reverseLinkRelation: OBSIDIAN_SCALES,
    linkingEventId: TALENTS.OBSIDIAN_SCALES_TALENT.id,
    linkingEventType: [EventType.ApplyBuff, EventType.RefreshBuff],
    referencedEventId: TALENTS.OBSIDIAN_SCALES_TALENT.id,
    referencedEventType: EventType.Cast,
    anyTarget: true,
    forwardBufferMs: CAST_BUFFER,
    backwardBufferMs: CAST_BUFFER,
  },
  {
    linkRelation: RENEWING_BLAZE,
    reverseLinkRelation: RENEWING_BLAZE,
    linkingEventId: TALENTS.RENEWING_BLAZE_TALENT.id,
    linkingEventType: EventType.ApplyBuff,
    referencedEventId: TALENTS.RENEWING_BLAZE_TALENT.id,
    referencedEventType: EventType.Cast,
    anyTarget: true,
    forwardBufferMs: CAST_BUFFER,
    backwardBufferMs: CAST_BUFFER,
  },
  {
    linkRelation: RENEWING_BLAZE_HEAL,
    reverseLinkRelation: RENEWING_BLAZE_HEAL,
    linkingEventId: TALENTS.RENEWING_BLAZE_TALENT.id,
    linkingEventType: EventType.ApplyBuff,
    referencedEventId: SPELLS.RENEWING_BLAZE_HEAL.id,
    referencedEventType: EventType.Heal,
    anyTarget: true,
    anySource: false, // We only want to be tracking our own Buffs, not any external ones
    forwardBufferMs: RENEWING_BLAZE_DURATION,
  },
];

class DefensiveCastLinkNormalizer extends EventLinkNormalizer {
  constructor(options: Options) {
    super(options, EVENT_LINKS);
  }
}

export default DefensiveCastLinkNormalizer;
