import Analyzer from 'parser/core/Analyzer';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  CastEvent,
  GetRelatedEvents,
  GetRelatedEvent,
  EventType,
} from 'parser/core/Events';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import ArcaneChargeTracker from '../core/ArcaneChargeTracker';
import { getManaPercentage, getTargetHealthPercentage } from '../../shared/helpers';

export default class ArcaneBarrage extends Analyzer {
  static dependencies = {
    spellUsable: SpellUsable,
    arcaneChargeTracker: ArcaneChargeTracker,
  };

  protected spellUsable!: SpellUsable;
  protected arcaneChargeTracker!: ArcaneChargeTracker;

  barrageData: ArcaneBarrageData[] = [];

  constructor(options: Options) {
    super(options);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_BARRAGE),
      this.onBarrage,
    );
  }

  onBarrage(event: CastEvent) {
    this.barrageData.push({
      cast: event,
      mana: getManaPercentage(event),
      charges: this.arcaneChargeTracker.current,
      precast: GetRelatedEvent(event, 'precast'),
      targetsHit: GetRelatedEvents(event, EventType.Damage).length || 0,
      clearcasting: this.selectedCombatant.hasBuff(
        SPELLS.CLEARCASTING_ARCANE.id,
        event.timestamp - 10,
      ),
      burdenOfPower: this.selectedCombatant.hasBuff(SPELLS.BURDEN_OF_POWER_BUFF.id),
      gloriousIncandescence: this.selectedCombatant.hasBuff(
        TALENTS.GLORIOUS_INCANDESCENCE_TALENT.id,
      ),
      salvoStacks:
        this.selectedCombatant.getBuff(SPELLS.ARCANE_SALVO_BUFF, event.timestamp - 10)?.stacks || 0,
      arcaneOrbAvail: this.spellUsable.isAvailable(SPELLS.ARCANE_ORB.id),
      touchCD: this.spellUsable.cooldownRemaining(TALENTS.TOUCH_OF_THE_MAGI_TALENT.id),
      health: getTargetHealthPercentage(event),
    });

    this.arcaneChargeTracker.clearCharges(event);
  }
}

export interface ArcaneBarrageData {
  cast: CastEvent;
  mana?: number;
  charges: number;
  precast?: CastEvent;
  targetsHit: number;
  clearcasting: boolean;
  burdenOfPower: boolean;
  gloriousIncandescence: boolean;
  salvoStacks: number;
  arcaneOrbAvail: boolean;
  touchCD: number;
  health?: number;
}
