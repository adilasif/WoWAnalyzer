import MageAnalyzer from '../../shared/MageAnalyzer';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  CastEvent,
  ApplyBuffEvent,
  ApplyBuffStackEvent,
  RefreshBuffEvent,
  GetRelatedEvents,
  GetRelatedEvent,
  EventType,
} from 'parser/core/Events';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import ArcaneChargeTracker from '../core/ArcaneChargeTracker';
import { getManaPercentage, getTargetHealthPercentage } from '../../shared/helpers';

const TEMPO_DURATION = 12000;

export default class ArcaneBarrage extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
    arcaneChargeTracker: ArcaneChargeTracker,
  };

  protected arcaneChargeTracker!: ArcaneChargeTracker;

  barrageData: ArcaneBarrageData[] = [];
  private lastTempoApply = 0;

  constructor(options: Options) {
    super(options);
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_TEMPO_BUFF),
      this.onTempo,
    );
    this.addEventListener(
      Events.applybuffstack.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_TEMPO_BUFF),
      this.onTempo,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_TEMPO_BUFF),
      this.onTempo,
    );
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.ARCANE_BARRAGE),
      this.onBarrage,
    );
  }

  onTempo(event: ApplyBuffEvent | ApplyBuffStackEvent | RefreshBuffEvent) {
    this.lastTempoApply = event.timestamp;
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
      arcaneSoul: this.selectedCombatant.hasBuff(SPELLS.ARCANE_SOUL_BUFF.id),
      burdenOfPower: this.selectedCombatant.hasBuff(SPELLS.BURDEN_OF_POWER_BUFF.id),
      gloriousIncandescence: this.selectedCombatant.hasBuff(
        TALENTS.GLORIOUS_INCANDESCENCE_TALENT.id,
      ),
      arcaneOrbAvail: this.spellUsable.isAvailable(SPELLS.ARCANE_ORB.id),
      touchCD: this.getCooldownRemaining(TALENTS.TOUCH_OF_THE_MAGI_TALENT.id),
      tempoRemaining: this.getTempoData(event),
      health: getTargetHealthPercentage(event),
    });

    this.arcaneChargeTracker.clearCharges(event);
  }

  private getTempoData(event: CastEvent): number | undefined {
    const hasTempo = this.selectedCombatant.hasBuff(SPELLS.ARCANE_TEMPO_BUFF.id);
    return hasTempo ? TEMPO_DURATION - (event.timestamp - this.lastTempoApply) : undefined;
  }
}

export interface ArcaneBarrageData {
  cast: CastEvent;
  mana?: number;
  charges: number;
  precast?: CastEvent;
  targetsHit: number;
  clearcasting: boolean;
  arcaneSoul: boolean;
  burdenOfPower: boolean;
  gloriousIncandescence: boolean;
  arcaneOrbAvail: boolean;
  touchCD: number;
  tempoRemaining?: number;
  health?: number;
}
