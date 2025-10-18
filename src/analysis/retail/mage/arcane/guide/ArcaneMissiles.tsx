import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { formatDurationMillisMinSec } from 'common/format';
import Analyzer from 'parser/core/Analyzer';
import {
  MageGuideSection,
  InlineStatistic,
  CastSummary,
  type CastEvaluation,
} from '../../shared/components';
import { evaluateQualitativePerformanceByThreshold } from 'parser/ui/QualitativePerformance';

import ArcaneMissiles, { ArcaneMissilesData } from '../analyzers/ArcaneMissiles';

const MISSILE_EARLY_CLIP_DELAY = 200;

class ArcaneMissilesGuide extends Analyzer {
  static dependencies = {
    arcaneMissiles: ArcaneMissiles
  };

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

  /**
   * Evaluates a single Arcane Missiles cast for CastSummary.
   * Returns performance and reason for tooltip display.
   *
   * Evaluation priority: fail → perfect → good → ok → default
   */
  private evaluateMissilesCast(am: ArcaneMissilesData): CastEvaluation {
    const clippedBeforeGCD =
      am.channelEnd && am.gcdEnd && am.gcdEnd - am.channelEnd > MISSILE_EARLY_CLIP_DELAY;
    const hasValidTiming = am.channelEndDelay !== undefined && am.nextCast !== undefined;
    const goodChannelDelay =
      hasValidTiming &&
      (this.channelDelayUtil(am.channelEndDelay!) === QualitativePerformance.Good ||
        this.channelDelayUtil(am.channelEndDelay!) === QualitativePerformance.Perfect);

    // Fail conditions (highest priority)
    if (clippedBeforeGCD) {
      return {
        timestamp: am.cast.timestamp,
        performance: QualitativePerformance.Fail,
        reason: 'Clipped Missiles before GCD ended - significant DPS loss',
      };
    }

    if (!hasValidTiming) {
      return {
        timestamp: am.cast.timestamp,
        performance: QualitativePerformance.Fail,
        reason: 'Cannot determine channel timing - likely data issue',
      };
    }

    // Perfect conditions
    if (am.clearcastingCapped) {
      return {
        timestamp: am.cast.timestamp,
        performance: QualitativePerformance.Perfect,
        reason: 'Perfect - avoided munching Clearcasting charges by using when capped',
      };
    }

    if (this.hasAetherAttunement && am.aetherAttunement && am.clipped && goodChannelDelay) {
      return {
        timestamp: am.cast.timestamp,
        performance: QualitativePerformance.Perfect,
        reason: 'Perfect clip timing with Aether Attunement and good delay',
      };
    }

    // Good conditions
    if (this.hasAetherAttunement && am.aetherAttunement && am.clipped) {
      return {
        timestamp: am.cast.timestamp,
        performance: QualitativePerformance.Good,
        reason: 'Good clip timing with Aether Attunement',
      };
    }

    if (!this.hasAetherAttunement && !am.aetherAttunement && !am.clipped) {
      return {
        timestamp: am.cast.timestamp,
        performance: QualitativePerformance.Good,
        reason: 'Good - full channel without Aether Attunement (optimal without talent)',
      };
    }

    if (goodChannelDelay) {
      return {
        timestamp: am.cast.timestamp,
        performance: QualitativePerformance.Good,
        reason: `Good timing - ${am.channelEndDelay ? formatDurationMillisMinSec(am.channelEndDelay, 3) : '???'} delay to next cast`,
      };
    }

    // Ok conditions
    if (!am.aetherAttunement && !am.clipped) {
      return {
        timestamp: am.cast.timestamp,
        performance: QualitativePerformance.Ok,
        reason: 'Full channel - not clipped but could be optimized with Aether Attunement',
      };
    }

    // Default
    return {
      timestamp: am.cast.timestamp,
      performance: QualitativePerformance.Ok,
      reason: am.channelEndDelay
        ? `Standard usage - ${formatDurationMillisMinSec(am.channelEndDelay, 3)} delay to next cast`
        : 'Standard Arcane Missiles usage',
    };
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
        <CastSummary
          spell={TALENTS.ARCANE_MISSILES_TALENT}
          casts={this.arcaneMissiles.missileData.map((cast) => this.evaluateMissilesCast(cast))}
          formatTimestamp={this.owner.formatTimestamp.bind(this.owner)}
          showBreakdown
        />
      </MageGuideSection>
    );
  }
}

export default ArcaneMissilesGuide;
