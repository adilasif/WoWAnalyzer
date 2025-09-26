import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import {
  BaseMageGuide,
  MageGuideComponents,
  createRuleset,
  type GuideLike,
  type ModuleLike,
} from '../../shared/guide';

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

    // Create rules to evaluate Arcane Tempo performance
    const tempoData = {
      uptime: this.arcaneTempo.buffUptimePercent,
      averageStacks: this.arcaneTempo.averageStacks,
      timestamp: this.owner.fight.start_time,
    };
    const thresholds = this.arcaneTempo.arcaneTempoUptimeThresholds.isLessThan;

    const tempoRuleset = createRuleset(tempoData, this as GuideLike)
      .createRule({
        id: 'excellentUptime',
        check: () => tempoData.uptime >= thresholds.minor,
        failureText: `Uptime could be higher (${(tempoData.uptime * 100).toFixed(1)}%)`,
        successText: `Excellent uptime (${(tempoData.uptime * 100).toFixed(1)}%)`,
      })

      .createRule({
        id: 'goodUptime',
        check: () => tempoData.uptime >= thresholds.average,
        failureText: `Uptime needs improvement (${(tempoData.uptime * 100).toFixed(1)}%)`,
        successText: `Good uptime (${(tempoData.uptime * 100).toFixed(1)}%)`,
      })

      .createRule({
        id: 'minimumUptime',
        check: () => tempoData.uptime >= thresholds.major,
        failureText: `Very low uptime (${(tempoData.uptime * 100).toFixed(1)}%)`,
        successText: `Minimum acceptable uptime (${(tempoData.uptime * 100).toFixed(1)}%)`,
      })

      .perfectIf(['excellentUptime'])
      .goodIf(['goodUptime'])
      .okIf(['minimumUptime']);

    const dataComponents = [
      MageGuideComponents.createBuffStackUptime(
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
      MageGuideComponents.createExpandableCastItem(
        TALENTS.ARCANE_TEMPO_TALENT,
        this.owner.fight.start_time,
        this.owner as ModuleLike,
        tempoRuleset.getRuleResults(),
        tempoRuleset.getPerformance(),
        undefined,
      ),
    ];

    return MageGuideComponents.createSubsection(
      explanation,
      dataComponents as JSX.Element[],
      'Arcane Tempo',
    );
  }
}

export default ArcaneTempoGuide;
