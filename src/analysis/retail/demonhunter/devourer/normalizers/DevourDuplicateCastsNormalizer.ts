import { AnyEvent, EventType } from 'parser/core/Events';
import EventsNormalizer from 'parser/core/EventsNormalizer';
import { FAKE_THEHUNT_CAST_ID, FAKE_VOIDBLADE_CAST_ID } from '../constants';

// Void Metamorphosis isn't considered a cast, even in WCL (as of 2nd week of 12.0.0 prepatch)
// This normalizer fabricates a proper CastEvent every time the buff is applied to the player
class DevourDuplicateCastsNormalizer extends EventsNormalizer {
  normalize(events: AnyEvent[]) {
    const fixedEvents: AnyEvent[] = [];

    events.forEach((event) => {
      if (
        event.type === EventType.Cast &&
        (event.ability.guid === FAKE_THEHUNT_CAST_ID ||
          event.ability.guid === FAKE_VOIDBLADE_CAST_ID)
      ) {
        return;
      }
      fixedEvents.push(event);
    });

    return fixedEvents;
  }
}

export default DevourDuplicateCastsNormalizer;
