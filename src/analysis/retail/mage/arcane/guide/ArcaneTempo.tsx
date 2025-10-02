import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import Analyzer from 'parser/core/Analyzer';
import { evaluateEvent } from '../../shared/guide';
import { GuideBuilder } from '../../shared/guide/GuideBuilder';
import { ARCANE_TEMPO_MAX_STACKS } from '../../shared/constants';

import ArcaneTempo from '../analyzers/ArcaneTempo';
import { getUptimesFromBuffHistory } from 'parser/ui/UptimeBar';
import { getStackUptimesFromBuffHistory } from 'parser/ui/UptimeStackBar';

const TEMPO_COLOR = '#cd1bdf';
const TEMPO_BG_COLOR = '#7e5da8';

class ArcaneTempoGuide extends Analyzer {
  static dependencies = {
    arcaneTempo: ArcaneTempo,
  };

  protected arcaneTempo!: ArcaneTempo;

  get guideSubsection(): JSX.Element {
    const arcaneTempo = <SpellLink spell={TALENTS.ARCANE_TEMPO_TALENT} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;

    const explanation = (
      <>
        <div>
          <b>{arcaneTempo}</b> grants a high amount of haste if uptime is maintained at max stacks.
          It can take a while to get back up to max if you let it fall. Cast {arcaneBarrage} before
          it falls to maintain the buff.
        </div>
      </>
    );
    const buffHistory = this.selectedCombatant.getBuffHistory(SPELLS.ARCANE_TEMPO_BUFF.id);
    const overallUptimes = getUptimesFromBuffHistory(buffHistory, this.owner.currentTimestamp);
    const stackUptimes = getStackUptimesFromBuffHistory(buffHistory, this.owner.currentTimestamp);
    const tempoData = {
      uptime: this.arcaneTempo.buffUptimePercent,
      averageStacks: this.arcaneTempo.averageStacks,
      timestamp: this.owner.fight.start_time,
    };
    const thresholds = this.arcaneTempo.arcaneTempoUptimeThresholds.isLessThan;
    const uptimePercent = (tempoData.uptime * 100).toFixed(1);

    const tempoEntry = evaluateEvent(tempoData.timestamp, tempoData, this, {
      actionName: 'Arcane Tempo',

      perfectConditions: [
        {
          name: 'excellentUptime',
          check: tempoData.uptime >= thresholds.minor,
          description: `Excellent uptime (${uptimePercent}%) - maximizing Arcane Tempo benefits`,
        },
      ],

      goodConditions: [
        {
          name: 'goodUptime',
          check: tempoData.uptime >= thresholds.average,
          description: `Good uptime (${uptimePercent}%) - maintaining most Arcane Tempo benefits`,
        },
      ],

      okConditions: [
        {
          name: 'minimumUptime',
          check: tempoData.uptime >= thresholds.major,
          description: `Minimum acceptable uptime (${uptimePercent}%) - could be improved`,
        },
      ],

      defaultPerformance: QualitativePerformance.Fail,
      defaultMessage: `Very low uptime (${uptimePercent}%) - need to maintain Arcane Tempo better`,
    });

    return new GuideBuilder(TALENTS.ARCANE_TEMPO_TALENT)
      .explanation(explanation)
      .addBuffStackUptime({
        stackData: stackUptimes,
        averageStacks: this.arcaneTempo.averageStacks,
        castData: [tempoEntry],
        uptimePercentage: this.arcaneTempo.buffUptimePercent,
        backgroundUptimes: overallUptimes,
        startTime: this.owner.fight.start_time,
        endTime: this.owner.fight.end_time,
        maxStacks: ARCANE_TEMPO_MAX_STACKS,
        barColor: TEMPO_COLOR,
        backgroundBarColor: TEMPO_BG_COLOR,
        tooltip: `This is the average number of stacks you had over the course of the fight, counting periods where you didn't have the buff as zero stacks.`,
      })
      .build();
  }
}

export default ArcaneTempoGuide;
