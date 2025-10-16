import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { MageGuideSection, BuffUptimeBar } from '../../shared/components';
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
        <b>{arcaneTempo}</b> grants a high amount of haste if uptime is maintained at max stacks. It
        can take a while to get back up to max if you let it fall. Cast {arcaneBarrage} before it
        falls to maintain the buff.
      </>
    );

    const buffHistory = this.selectedCombatant.getBuffHistory(SPELLS.ARCANE_TEMPO_BUFF.id);
    return (
      <MageGuideSection spell={TALENTS.ARCANE_TEMPO_TALENT} explanation={explanation}>
        <BuffUptimeBar
          spell={TALENTS.ARCANE_TEMPO_TALENT}
          buffHistory={buffHistory}
          startTime={this.owner.fight.start_time}
          endTime={this.owner.fight.end_time}
          maxStacks={ARCANE_TEMPO_MAX_STACKS}
          barColor={TEMPO_COLOR}
          backgroundBarColor={TEMPO_BG_COLOR}
        />
      </MageGuideSection>
    );
  }
}

export default ArcaneTempoGuide;
