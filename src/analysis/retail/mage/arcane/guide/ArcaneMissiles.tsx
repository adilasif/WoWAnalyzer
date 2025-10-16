import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { formatDurationMillisMinSec } from 'common/format';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import MageAnalyzer from '../../shared/MageAnalyzer';
import {
  evaluateEvents,
  MageGuideSection,
  CastBreakdown,
  InlineStatistic,
} from '../../shared/components';
import { evaluateQualitativePerformanceByThreshold } from 'parser/ui/QualitativePerformance';

import ArcaneMissiles from '../analyzers/ArcaneMissiles';

const MISSILE_EARLY_CLIP_DELAY = 200;

class ArcaneMissilesGuide extends MageAnalyzer {
  static dependencies = { ...MageAnalyzer.dependencies, arcaneMissiles: ArcaneMissiles };

  protected arcaneMissiles!: ArcaneMissiles;

  hasNetherPrecision: boolean = this.selectedCombatant.hasTalent(TALENTS.NETHER_PRECISION_TALENT);
  hasAetherAttunement: boolean = this.selectedCombatant.hasTalent(TALENTS.AETHER_ATTUNEMENT_TALENT);

  channelDelayUtil(delay: number) {
    const thresholds = this.arcaneMissiles.channelDelayThresholds.isGreaterThan;
    return evaluateQualitativePerformanceByThreshold({
      actual: delay,
      isGreaterThan: {
        perfect: thresholds.minor,
        good: thresholds.average,
        ok: thresholds.major,
        fail: 0,
      },
    });
  }

  get arcaneMissilesData(): BoxRowEntry[] {
    return evaluateEvents({
      events: this.arcaneMissiles.missileData,
      formatTimestamp: this.owner.formatTimestamp.bind(this.owner),
      evaluationLogic: (am) => {
        const clippedBeforeGCD =
          am.channelEnd && am.gcdEnd && am.gcdEnd - am.channelEnd > MISSILE_EARLY_CLIP_DELAY;
        const hasValidTiming = am.channelEndDelay !== undefined && am.nextCast !== undefined;
        const goodChannelDelay =
          hasValidTiming &&
          (this.channelDelayUtil(am.channelEndDelay!) === QualitativePerformance.Good ||
            this.channelDelayUtil(am.channelEndDelay!) === QualitativePerformance.Perfect);

        return {
          actionName: 'Arcane Missiles',

          failConditions: [
            {
              name: 'clippedEarly',
              check: Boolean(clippedBeforeGCD),
              description: 'Clipped Missiles before GCD ended - significant DPS loss',
            },
            {
              name: 'invalidTiming',
              check: !hasValidTiming,
              description: 'Cannot determine channel timing - likely data issue',
            },
          ],

          perfectConditions: [
            {
              name: 'cappedClearcasting',
              check: am.clearcastingCapped,
              description: 'Perfect - avoided munching Clearcasting charges by using when capped',
            },
            {
              name: 'optimalClip',
              active: this.hasAetherAttunement,
              check: am.aetherAttunement && am.clipped && goodChannelDelay,
              description: 'Perfect clip timing with Aether Attunement and good delay',
            },
          ],

          goodConditions: [
            {
              name: 'goodClipTiming',
              active: this.hasAetherAttunement,
              check: am.aetherAttunement && am.clipped,
              description: 'Good clip timing with Aether Attunement',
            },
            {
              name: 'fullChannelNoAether',
              active: !this.hasAetherAttunement,
              check: !am.aetherAttunement && !am.clipped,
              description: 'Good - full channel without Aether Attunement (optimal without talent)',
            },
            {
              name: 'goodDelay',
              check: goodChannelDelay,
              description: `Good timing - ${am.channelEndDelay ? formatDurationMillisMinSec(am.channelEndDelay, 3) : '???'} delay to next cast`,
            },
          ],

          okConditions: [
            {
              name: 'fullChannel',
              check: !am.aetherAttunement && !am.clipped,
              description:
                'Full channel - not clipped but could be optimized with Aether Attunement',
            },
          ],

          defaultPerformance: QualitativePerformance.Ok,
          defaultMessage: am.channelEndDelay
            ? `Standard usage - ${formatDurationMillisMinSec(am.channelEndDelay, 3)} delay to next cast`
            : 'Standard Arcane Missiles usage',
        };
      },
    });
  }

  get guideSubsection(): JSX.Element {
    const arcaneMissiles = <SpellLink spell={TALENTS.ARCANE_MISSILES_TALENT} />;
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;
    const aetherAttunement = <SpellLink spell={TALENTS.AETHER_ATTUNEMENT_TALENT} />;

    const explanation = (
      <>
        Ensure you are spending your <b>{clearcasting}</b> procs effectively with {arcaneMissiles}.
        <ul>
          <li>
            Cast {arcaneMissiles} immediately if capped on {clearcasting} charges, ignoring any of
            the below items, to avoid munching procs (gaining a charge while capped).
          </li>
          <li>Do not cast {arcaneMissiles} if you have .</li>
          <li>
            If you don't have {aetherAttunement}, you can optionally clip your {arcaneMissiles} cast
            once the GCD ends for a small damage boost.
          </li>
        </ul>
      </>
    );

    const averageDelayTooltip = (
      <>
        {formatDurationMillisMinSec(this.arcaneMissiles.averageChannelDelay, 3)} Average Delay from
        End Channel to Next Cast.
      </>
    );

    const averageDelayPerf = this.channelDelayUtil(this.arcaneMissiles.averageChannelDelay);

    return (
      <MageGuideSection spell={TALENTS.ARCANE_MISSILES_TALENT} explanation={explanation}>
        <InlineStatistic
          value={formatDurationMillisMinSec(this.arcaneMissiles.averageChannelDelay, 3)}
          label="Average Delay from Channel End to Next Cast"
          tooltip={averageDelayTooltip}
          performance={averageDelayPerf}
        />
        <CastBreakdown
          spell={TALENTS.ARCANE_MISSILES_TALENT}
          castEntries={this.arcaneMissilesData}
        />
      </MageGuideSection>
    );
  }
}

export default ArcaneMissilesGuide;
