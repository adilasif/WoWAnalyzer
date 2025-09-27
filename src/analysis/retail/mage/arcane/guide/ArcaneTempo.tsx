import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BaseMageGuide, GuideComponents, evaluateGuide } from '../../shared/guide';

import ArcaneTempo from '../talents/ArcaneTempo';
import { getUptimesFromBuffHistory } from 'parser/ui/UptimeBar';
import { getStackUptimesFromBuffHistory } from 'parser/ui/UptimeStackBar';
import { ARCANE_TEMPO_MAX_STACKS } from '../../shared';

const TEMPO_COLOR = '#cd1bdf';
const TEMPO_BG_COLOR = '#7e5da8';

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
    const overallUptimes = getUptimesFromBuffHistory(buffHistory, this.owner.currentTimestamp);
    const stackUptimes = getStackUptimesFromBuffHistory(buffHistory, this.owner.currentTimestamp);

    // Evaluate Arcane Tempo performance using universal template
    const tempoData = {
      uptime: this.arcaneTempo.buffUptimePercent,
      averageStacks: this.arcaneTempo.averageStacks,
      timestamp: this.owner.fight.start_time,
    };
    const thresholds = this.arcaneTempo.arcaneTempoUptimeThresholds.isLessThan;
    const uptimePercent = (tempoData.uptime * 100).toFixed(1);

    const tempoEntry = evaluateGuide(tempoData.timestamp, tempoData, this, {
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

    const dataComponents = [
      GuideComponents.createBuffStackUptime(
        TALENTS.ARCANE_TEMPO_TALENT,
        this.arcaneTempo.buffUptimePercent,
        this.arcaneTempo.averageStacks,
        stackUptimes,
        overallUptimes,
        this.owner.fight.start_time,
        this.owner.fight.end_time,
        ARCANE_TEMPO_MAX_STACKS,
        TEMPO_COLOR,
        TEMPO_BG_COLOR,
        `This is the average number of stacks you had over the course of the fight, counting periods where you didn't have the buff as zero stacks.`,
      ),
      GuideComponents.createPerCastSummary(TALENTS.ARCANE_TEMPO_TALENT, [tempoEntry]),
    ];

    return GuideComponents.createSubsection(
      explanation,
      dataComponents as JSX.Element[],
      'Arcane Tempo',
    );
  }
}

export default ArcaneTempoGuide;
