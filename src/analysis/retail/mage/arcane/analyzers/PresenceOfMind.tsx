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

  pomData: PresenceOfMindData[] = [];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.PRESENCE_OF_MIND_TALENT);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.PRESENCE_OF_MIND_TALENT),
      this.onPresenceMind,
    );
  }

  onPresenceMind(event: CastEvent) {
    const touchCancelDelay = this.getTouchCancelDelay(event);

    this.pomData.push({
      cast: event,
      targets: this.getBarrageTargetCount(event),
      charges: this.chargeTracker.current,
      stacksUsed: this.getBuffedCastCount(event),
      usedTouchEnd: touchCancelDelay !== undefined,
      touchCancelDelay,
    });
  }

  private getBarrageTargetCount(event: CastEvent): number | undefined {
    const barrage: CastEvent | undefined = GetRelatedEvent(event, EventRelations.BARRAGE_CAST);
    if (!barrage) {
      return undefined;
    }
    const barrageHits: DamageEvent[] | undefined = GetRelatedEvents(barrage, EventRelations.DAMAGE);
    return barrageHits?.length;
  }

  private getBuffedCastCount(event: CastEvent): number {
    const blasts: CastEvent[] | undefined = GetRelatedEvents(event, EventRelations.CAST);
    const buffedCasts = blasts.filter((b) =>
      this.selectedCombatant.hasBuff(TALENTS.PRESENCE_OF_MIND_TALENT.id, b.timestamp),
    );
    return buffedCasts.length || 0;
  }

  private getTouchCancelDelay(event: CastEvent): number | undefined {
    const buffRemove: RemoveBuffEvent | undefined = GetRelatedEvent(
      event,
      EventRelations.REMOVE_BUFF,
    );
    const touchRemove: RemoveDebuffEvent | undefined = GetRelatedEvent(
      event,
      EventRelations.REMOVE_DEBUFF,
    );

    if (!touchRemove || !buffRemove || buffRemove.timestamp <= touchRemove.timestamp) {
      return undefined;
    }

    return buffRemove.timestamp - touchRemove.timestamp;
  }
}

export interface PresenceOfMindData {
  cast: CastEvent;
  targets?: number;
  charges: number;
  stacksUsed: number;
  usedTouchEnd?: boolean;
  touchCancelDelay?: number;
}
