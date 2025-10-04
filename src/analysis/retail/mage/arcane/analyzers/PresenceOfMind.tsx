import TALENTS from 'common/TALENTS/mage';
import { SELECTED_PLAYER, Options } from 'parser/core/Analyzer';
import MageAnalyzer from '../../shared/MageAnalyzer';
import Events, {
  CastEvent,
  DamageEvent,
  GetRelatedEvents,
  GetRelatedEvent,
  RemoveBuffEvent,
  RemoveDebuffEvent,
} from 'parser/core/Events';
import { EventRelations } from '../../shared/helpers';
import ArcaneChargeTracker from '../core/ArcaneChargeTracker';

export default class PresenceOfMind extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
    chargeTracker: ArcaneChargeTracker,
  };
  protected chargeTracker!: ArcaneChargeTracker;

  pomCasts: PresenceOfMindCast[] = [];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.PRESENCE_OF_MIND_TALENT);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.PRESENCE_OF_MIND_TALENT),
      this.onPresenceMind,
    );
  }

  onPresenceMind(event: CastEvent) {
    const blasts: CastEvent[] | undefined = GetRelatedEvents(event, EventRelations.CAST);
    const barrage: CastEvent | undefined = GetRelatedEvent(event, EventRelations.BARRAGE_CAST);
    const barrageHits: DamageEvent[] | undefined =
      barrage && GetRelatedEvents(barrage, EventRelations.DAMAGE);
    const buffedCasts = blasts.filter((b) =>
      this.selectedCombatant.hasBuff(TALENTS.PRESENCE_OF_MIND_TALENT.id, b.timestamp),
    );
    const buffRemove: RemoveBuffEvent | undefined = GetRelatedEvent(
      event,
      EventRelations.REMOVE_BUFF,
    );
    const touchRemove: RemoveDebuffEvent | undefined = GetRelatedEvent(
      event,
      EventRelations.REMOVE_DEBUFF,
    );
    const touchCancelDelay =
      touchRemove && buffRemove && buffRemove.timestamp > touchRemove.timestamp
        ? buffRemove.timestamp - touchRemove.timestamp
        : undefined;

    this.pomCasts.push({
      ordinal: this.pomCasts.length + 1,
      cast: event,
      targets: barrageHits?.length,
      charges: this.chargeTracker.current,
      stacksUsed: buffedCasts.length || 0,
      usedTouchEnd: touchCancelDelay !== undefined,
      touchCancelDelay,
    });
  }
}

export interface PresenceOfMindCast {
  ordinal: number;
  cast: CastEvent;
  targets?: number;
  charges: number;
  stacksUsed: number;
  usedTouchEnd?: boolean;
  touchCancelDelay?: number;
}
