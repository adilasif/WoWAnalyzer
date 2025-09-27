import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BaseMageGuide, evaluateEvent, evaluatePerformance } from '../../shared/guide';
import { GuideBuilder } from '../../shared/guide/GuideBuilder';

import ArcaneTempo from '../talents/ArcaneTempo';
import { getStackUptimesFromBuffHistory } from 'parser/ui/UptimeStackBar';

class ArcaneTempoGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
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
    const stackUptimes = getStackUptimesFromBuffHistory(buffHistory, this.owner.currentTimestamp);

    // Evaluate Arcane Tempo performance using universal template
    const tempoData = {
      uptime: this.arcaneTempo.buffUptimePercent,
      averageStacks: this.arcaneTempo.averageStacks,
      timestamp: this.owner.fight.start_time,
    };
    const thresholds = this.arcaneTempo.arcaneTempoUptimeThresholds.isLessThan;
    const uptimePercent = (tempoData.uptime * 100).toFixed(1);

    const tempoEntry = evaluateEvent(tempoData.timestamp, tempoData, this, {
      actionName: 'Arcane Tempo',

      // PERFECT: Excellent uptime
      perfectConditions: [
        {
          name: 'excellentUptime',
          check: tempoData.uptime >= thresholds.minor,
          description: `Excellent uptime (${uptimePercent}%) - maximizing Arcane Tempo benefits`,
        },
      ],

      // GOOD: Acceptable uptime
      goodConditions: [
        {
          name: 'goodUptime',
          check: tempoData.uptime >= thresholds.average,
          description: `Good uptime (${uptimePercent}%) - maintaining most Arcane Tempo benefits`,
        },
      ],

      // OK: Minimum acceptable uptime
      okConditions: [
        {
          name: 'minimumUptime',
          check: tempoData.uptime >= thresholds.major,
          description: `Minimum acceptable uptime (${uptimePercent}%) - could be improved`,
        },
      ],

      // Default if below minimum
      defaultPerformance: QualitativePerformance.Fail,
      defaultMessage: `Very low uptime (${uptimePercent}%) - need to maintain Arcane Tempo better`,
    });

    return new GuideBuilder(TALENTS.ARCANE_TEMPO_TALENT)
      .explanation(explanation)
      .addBuffStackUptime({
        stackData: stackUptimes,
        averageStacks: this.arcaneTempo.averageStacks,
        castData: [tempoEntry],
      })
      .addStatistic({
        value: `${uptimePercent}%`,
        label: 'Uptime',
        performance: evaluatePerformance(tempoData.uptime, thresholds, true),
      })
      .build();
  }
}

export default ArcaneTempoGuide;
