import SPELLS from 'common/SPELLS';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from '../../shared/MageAnalyzer';
import Events, {
  CastEvent,
  ApplyBuffEvent,
  ApplyBuffStackEvent,
  RemoveBuffEvent,
  RemoveBuffStackEvent,
  GetRelatedEvent,
} from 'parser/core/Events';
import { EventRelations } from '../../shared/helpers';

export default class Clearcasting extends MageAnalyzer {
  clearcastingProcs: ClearcastingProc[] = [];

  constructor(options: Options) {
    super(options);
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.CLEARCASTING_ARCANE),
      this.onClearcastingApply,
    );
    this.addEventListener(
      Events.applybuffstack.by(SELECTED_PLAYER).spell(SPELLS.CLEARCASTING_ARCANE),
      this.onClearcastingApply,
    );
  }

  onClearcastingApply(event: ApplyBuffEvent | ApplyBuffStackEvent) {
    const removeBuff: RemoveBuffEvent | RemoveBuffStackEvent | undefined = GetRelatedEvent(
      event,
      'BuffRemomve',
    );
    const missiles: CastEvent | undefined = GetRelatedEvent(event, EventRelations.CAST);

    this.clearcastingProcs.push({
      applied: event.timestamp,
      removed: removeBuff?.timestamp,
      missileCast: missiles,
      expired: !missiles,
    });
  }

  //ADD STATISTIC
}

export interface ClearcastingProc {
  applied: number;
  removed: number | undefined;
  missileCast: CastEvent | undefined;
  expired: boolean;
}
