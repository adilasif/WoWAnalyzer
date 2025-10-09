import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { evaluateEvents } from '../../shared/components';
import { GuideBuilder } from '../../shared/builders';
import { ARCANE_TEMPO_MAX_STACKS } from '../../shared/constants';

import ArcaneTempo from '../analyzers/ArcaneTempo';

const TEMPO_COLOR = '#cd1bdf';
const TEMPO_BG_COLOR = '#7e5da8';

class ArcaneTempoGuide extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
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

    const tempoData = {
      uptime: this.arcaneTempo.buffUptimePercent,
      averageStacks: this.arcaneTempo.averageStacks,
      timestamp: this.owner.fight.start_time,
    };
    const thresholds = this.arcaneTempo.arcaneTempoUptimeThresholds.isLessThan;
    const uptimePercent = (tempoData.uptime * 100).toFixed(1);

    const castData = evaluateEvents({
      events: [tempoData],
      formatTimestamp: this.owner.formatTimestamp.bind(this.owner),
      evaluationLogic: (data) => ({
        actionName: 'Arcane Tempo',

        perfectConditions: [
          {
            name: 'excellentUptime',
            check: data.uptime >= thresholds.minor,
            description: `Excellent uptime (${uptimePercent}%) - maximizing Arcane Tempo benefits`,
          },
        ],

        goodConditions: [
          {
            name: 'goodUptime',
            check: data.uptime >= thresholds.average,
            description: `Good uptime (${uptimePercent}%) - maintaining most Arcane Tempo benefits`,
          },
        ],

        okConditions: [
          {
            name: 'minimumUptime',
            check: data.uptime >= thresholds.major,
            description: `Minimum acceptable uptime (${uptimePercent}%) - could be improved`,
          },
        ],

        defaultPerformance: QualitativePerformance.Fail,
        defaultMessage: `Very low uptime (${uptimePercent}%) - need to maintain Arcane Tempo better`,
      }),
    });

    return new GuideBuilder(TALENTS.ARCANE_TEMPO_TALENT)
      .explanation(explanation)
      .addBuffUptime({
        analyzer: this,
        buffSpell: SPELLS.ARCANE_TEMPO_BUFF,
        castData,
        maxStacks: ARCANE_TEMPO_MAX_STACKS,
        barColor: TEMPO_COLOR,
        backgroundBarColor: TEMPO_BG_COLOR,
      })
      .build();
  }
}

export default ArcaneTempoGuide;
