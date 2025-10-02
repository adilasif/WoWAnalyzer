import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { formatDurationMillisMinSec } from 'common/format';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import Analyzer from 'parser/core/Analyzer';
import { evaluateEvent, evaluatePerformance } from '../../shared/guide';
import { GuideBuilder } from '../../shared/guide/GuideBuilder';

import ArcaneMissiles from '../analyzers/ArcaneMissiles';

const MISSILE_EARLY_CLIP_DELAY = 200;

class ArcaneMissilesGuide extends Analyzer {
  static dependencies = {
    arcaneMissiles: ArcaneMissiles,
  };

  protected arcaneMissiles!: ArcaneMissiles;

  hasNetherPrecision: boolean = this.selectedCombatant.hasTalent(TALENTS.NETHER_PRECISION_TALENT);
  hasAetherAttunement: boolean = this.selectedCombatant.hasTalent(TALENTS.AETHER_ATTUNEMENT_TALENT);

  channelDelayUtil(delay: number) {
    return evaluatePerformance(
      delay,
      this.arcaneMissiles.channelDelayThresholds.isGreaterThan,
      false,
    );
  }

  get arcaneMissilesData(): BoxRowEntry[] {
    return this.arcaneMissiles.missileCasts.map((am) => {
      const clippedBeforeGCD =
        am.channelEnd && am.gcdEnd && am.gcdEnd - am.channelEnd > MISSILE_EARLY_CLIP_DELAY;
      const hadBuffNP = this.hasNetherPrecision && am.netherPrecision;
      const badClip = am.clipped && clippedBeforeGCD;
      const noClip = !am.aetherAttunement && !am.clipped;
      const hasValidTiming = am.channelEndDelay !== undefined && am.nextCast !== undefined;
      const goodChannelDelay =
        hasValidTiming &&
        (this.channelDelayUtil(am.channelEndDelay!) === QualitativePerformance.Good ||
          this.channelDelayUtil(am.channelEndDelay!) === QualitativePerformance.Perfect);

      return evaluateEvent(am.cast.timestamp, am, this, {
        actionName: 'Arcane Missiles',

        failConditions: [
          {
            name: 'netherPrecisionWaste',
            check: hadBuffNP && !am.clearcastingCapped,
            description: 'Wasted Nether Precision buff - should not cast Missiles with this buff',
          },
          {
            name: 'clippedEarly',
            check: Boolean(badClip),
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
            check: am.clipped && am.aetherAttunement && goodChannelDelay,
            description: 'Perfect clip timing with Aether Attunement and good delay',
          },
        ],

        goodConditions: [
          {
            name: 'goodClipTiming',
            check: am.clipped && am.aetherAttunement,
            description: 'Good clip timing with Aether Attunement',
          },
          {
            name: 'fullChannelNoAether',
            check: noClip && !this.hasAetherAttunement,
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
            check: noClip,
            description: 'Full channel - not clipped but could be optimized with Aether Attunement',
          },
        ],

        defaultPerformance: QualitativePerformance.Ok,
        defaultMessage: am.channelEndDelay
          ? `Standard usage - ${formatDurationMillisMinSec(am.channelEndDelay, 3)} delay to next cast`
          : 'Standard Arcane Missiles usage',
      });
    });
  }

  get guideSubsection(): JSX.Element {
    const arcaneMissiles = <SpellLink spell={TALENTS.ARCANE_MISSILES_TALENT} />;
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;
    const netherPrecision = <SpellLink spell={TALENTS.NETHER_PRECISION_TALENT} />;
    const aetherAttunement = <SpellLink spell={TALENTS.AETHER_ATTUNEMENT_TALENT} />;

    const explanation = (
      <>
        <div>
          Ensure you are spending your <b>{clearcasting}</b> procs effectively with {arcaneMissiles}
          .
        </div>
        <div>
          <ul>
            <li>
              Cast {arcaneMissiles} immediately if capped on {clearcasting} charges, ignoring any of
              the below items, to avoid munching procs (gaining a charge while capped).
            </li>
            <li>
              Do not cast {arcaneMissiles} if you have {netherPrecision}.
            </li>
            <li>
              If you don't have {aetherAttunement}, you can optionally clip your {arcaneMissiles}{' '}
              cast once the GCD ends for a small damage boost.
            </li>
          </ul>
        </div>
      </>
    );

    const averageDelayTooltip = (
      <>
        {formatDurationMillisMinSec(this.arcaneMissiles.averageChannelDelay, 3)} Average Delay from
        End Channel to Next Cast.
      </>
    );

    return new GuideBuilder(TALENTS.ARCANE_MISSILES_TALENT, 'Arcane Missiles')
      .explanation(explanation)
      .addStatistic({
        value: formatDurationMillisMinSec(this.arcaneMissiles.averageChannelDelay, 3),
        label: 'Average Delay from Channel End to Next Cast',
        performance: this.channelDelayUtil(this.arcaneMissiles.averageChannelDelay),
        tooltip: averageDelayTooltip,
      })
      .addCastSummary({
        castData: this.arcaneMissilesData,
      })
      .build();
  }
}

export default ArcaneMissilesGuide;
