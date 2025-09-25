import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { formatDurationMillisMinSec } from 'common/format';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { BaseMageGuide, PerformanceUtils, MageGuideComponents, createRuleset } from '../../shared/guide';

import ArcaneMissiles from '../core/ArcaneMissiles';

const MISSILE_LATE_CLIP_DELAY = 500;
const MISSILE_EARLY_CLIP_DELAY = 200;

class ArcaneMissilesGuide extends BaseMageGuide {
  static dependencies = {
    arcaneMissiles: ArcaneMissiles,
  };

  protected arcaneMissiles!: ArcaneMissiles;

  hasNetherPrecision: boolean = this.selectedCombatant.hasTalent(TALENTS.NETHER_PRECISION_TALENT);
  hasAetherAttunement: boolean = this.selectedCombatant.hasTalent(TALENTS.AETHER_ATTUNEMENT_TALENT);

  channelDelayUtil(delay: number) {
    return PerformanceUtils.evaluatePerformance(
      delay,
      this.arcaneMissiles.channelDelayThresholds.isGreaterThan,
      false // lower delay is better
    );
  }

  get arcaneMissilesData(): BoxRowEntry[] {
    return this.arcaneMissiles.missileCasts.map((am) => {
      const clippedAtGCD = am.channelEnd && am.gcdEnd &&
        am.channelEnd - am.gcdEnd < MISSILE_LATE_CLIP_DELAY;
      const clippedBeforeGCD = am.channelEnd && am.gcdEnd &&
        am.gcdEnd - am.channelEnd > MISSILE_EARLY_CLIP_DELAY;
      const hadBuffNP = this.hasNetherPrecision && am.netherPrecision;
      const badClip = am.clipped && clippedBeforeGCD;
      const noClip = !am.aetherAttunement && !am.clipped;
      const goodClip = !am.aetherAttunement && am.clipped && clippedAtGCD;

      return createRuleset(am, this)

        // ===== INDIVIDUAL RULE DEFINITIONS =====

        // Critical failure rules
        .createRule({
          id: 'netherPrecisionActive',
          check: () => !(hadBuffNP && !am.clearcastingCapped),
          failureText: 'Nether Precision Buff Active',
          successText: hadBuffNP ? 'Had Nether Precision but was capped on Clearcasting' : 'No Nether Precision active',
          failurePerformance: QualitativePerformance.Fail
        })

        .createRule({
          id: 'clippedBeforeGCD',
          check: () => !badClip,
          failureText: 'Clipped Missiles Before GCD',
          successText: badClip ? undefined : 'Did not clip before GCD',
          failurePerformance: QualitativePerformance.Fail
        })

        .createRule({
          id: 'nextCastFound',
          check: () => am.channelEndDelay !== undefined && am.nextCast !== undefined,
          failureText: 'Next Cast Not Found',
          successText: am.nextCast ? `Next cast: ${am.nextCast.ability.name}` : undefined,
          failurePerformance: QualitativePerformance.Fail
        })

        // Positive condition rules
        .createRule({
          id: 'clearcastingCapped',
          check: () => am.clearcastingCapped,
          failureText: 'Not capped on Clearcasting charges',
          successText: 'Capped on Clearcasting Charges',
          failurePerformance: QualitativePerformance.Ok
        })

        .createRule({
          id: 'goodClip',
          check: () => am.clipped,
          failureText: 'Did not clip at GCD optimally',
          successText: 'Clipped at GCD with Aether Attunement',
          failurePerformance: QualitativePerformance.Ok
        })

        .createRule({
          id: 'fullChannel',
          check: () => noClip,
          failureText: 'Did not fully channel',
          successText: 'Full channeled without Aether Attunement',
          failurePerformance: QualitativePerformance.Ok
        })

        .createRule({
          id: 'channelDelay',
          check: () => {
            if (am.channelEndDelay === undefined) return false;
            const delayPerf = this.channelDelayUtil(am.channelEndDelay);
            return delayPerf === QualitativePerformance.Good || delayPerf === QualitativePerformance.Perfect;
          },
          failureText: am.channelEndDelay !== undefined ?
            `${formatDurationMillisMinSec(am.channelEndDelay, 3)} Delay Until Next Cast (${am.nextCast?.ability.name || 'Unknown'})` :
            'Channel delay unknown',
          successText: am.channelEndDelay !== undefined ?
            `Good timing: ${formatDurationMillisMinSec(am.channelEndDelay, 3)} delay` :
            undefined,
          failurePerformance: QualitativePerformance.Ok
        })

        // ===== PERFORMANCE CRITERIA =====

        // Perfect: Good clipping with optimal conditions
        .perfectIf(['netherPrecisionActive', 'clippedBeforeGCD', 'nextCastFound', 'goodClip'])

        // Good: Meeting basic requirements
        .goodIf(['netherPrecisionActive', 'clippedBeforeGCD', 'nextCastFound'])

        // Ok: Full channel without clipping issues
        .okIf(['netherPrecisionActive', 'clippedBeforeGCD', 'fullChannel'])

        // Fail if critical rules not met

        .evaluate(am.cast.timestamp);
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
          Ensure you are spending your <b>{clearcasting}</b> procs effectively with {arcaneMissiles}.
        </div>
        <div>
          <ul>
            <li>Cast {arcaneMissiles} immediately if capped on {clearcasting} charges, ignoring any of the below items, to avoid munching procs (gaining a charge while capped).</li>
            <li>Do not cast {arcaneMissiles} if you have {netherPrecision}.</li>
            <li>If you don't have {aetherAttunement}, you can optionally clip your {arcaneMissiles} cast once the GCD ends for a small damage boost.</li>
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

    const dataComponents = [
      MageGuideComponents.createStatistic(
        TALENTS.ARCANE_MISSILES_TALENT,
        formatDurationMillisMinSec(this.arcaneMissiles.averageChannelDelay, 3),
        'Average Delay from Channel End to Next Cast',
        this.channelDelayUtil(this.arcaneMissiles.averageChannelDelay),
        averageDelayTooltip
      ),
      MageGuideComponents.createPerCastSummary(
        TALENTS.ARCANE_MISSILES_TALENT,
        this.arcaneMissilesData,
      ),
    ];

    return MageGuideComponents.createSubsection(
      explanation,
      dataComponents,
      'Arcane Missiles',
    );
  }
}

export default ArcaneMissilesGuide;
