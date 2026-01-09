import type { JSX } from 'react';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { formatDurationMillisMinSec } from 'common/format';
import Analyzer from 'parser/core/Analyzer';
import CastSummary, { type CastEvaluation } from 'interface/guide/components/CastSummary';
import GuideSection from 'interface/guide/components/GuideSection';
import CastOverview from 'interface/guide/components/CastOverview';
import { evaluateQualitativePerformanceByThreshold } from 'parser/ui/QualitativePerformance';

import ArcaneMissiles, { ArcaneMissilesData } from '../analyzers/ArcaneMissiles';

const MISSILE_EARLY_CLIP_DELAY = 200;

class ArcaneMissilesGuide extends Analyzer {
  static dependencies = {
    arcaneMissiles: ArcaneMissiles,
  };

  protected arcaneMissiles!: ArcaneMissiles;

  hasAetherAttunement: boolean = this.selectedCombatant.hasTalent(TALENTS.AETHER_ATTUNEMENT_TALENT);
  hasOrbMastery: boolean = this.selectedCombatant.hasTalent(TALENTS.ORB_MASTERY_TALENT);
  hasHighVoltage: boolean = this.selectedCombatant.hasTalent(TALENTS.HIGH_VOLTAGE_TALENT);
  hasOverpoweredMissiles: boolean = this.selectedCombatant.hasTalent(
    TALENTS.OVERPOWERED_MISSILES_TALENT,
  );

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

  private buildOverviewStats() {
    const stats = [];

    const totalCasts = this.arcaneMissiles.missileData.length;
    const averageTicks =
      this.arcaneMissiles.missileData.reduce((sum, m) => sum + m.ticks, 0) / totalCasts;

    // Average delay from channel end
    stats.push({
      value: formatDurationMillisMinSec(this.arcaneMissiles.averageChannelDelay, 3),
      label: 'Avg Channel End Delay ',
      tooltip: (
        <>
          {formatDurationMillisMinSec(this.arcaneMissiles.averageChannelDelay, 3)} Average Delay
          from End Channel to Next Cast.
        </>
      ),
      performance: this.channelDelayUtil(this.arcaneMissiles.averageChannelDelay),
    });

    // Total casts
    stats.push({
      value: `${totalCasts}`,
      label: 'Total Casts',
      tooltip: <>Total number of Arcane Missiles casts during the encounter.</>,
    });

    // Average ticks
    stats.push({
      value: averageTicks.toFixed(1),
      label: 'Average Ticks',
      tooltip: <>Average number of damage ticks per Arcane Missiles cast.</>,
    });

    return stats;
  }

  private evaluateMissilesCast(am: ArcaneMissilesData): CastEvaluation {
    const clippedBeforeGCD =
      am.channelEnd && am.gcdEnd && am.gcdEnd - am.channelEnd > MISSILE_EARLY_CLIP_DELAY;
    const hasValidTiming = am.channelEndDelay !== undefined && am.nextCast !== undefined;
    const goodChannelDelay =
      hasValidTiming &&
      (this.channelDelayUtil(am.channelEndDelay!) === QualitativePerformance.Good ||
        this.channelDelayUtil(am.channelEndDelay!) === QualitativePerformance.Perfect);

    // FAIL CONDITIONS
    if (clippedBeforeGCD) {
      return {
        performance: QualitativePerformance.Fail,
        reason: 'Arcane Missiles Clipped during GCD',
        timestamp: am.cast.timestamp,
      };
    }

    if (am.clearcastingProcs === 0) {
      return {
        performance: QualitativePerformance.Fail,
        reason: 'No Clearcasting Proc',
        timestamp: am.cast.timestamp,
      };
    }

    // PERFECT CONDITIONS
    // Capped on Clearcasting
    if (am.clearcastingCapped) {
      return {
        performance: QualitativePerformance.Perfect,
        reason: 'Capped on Clearcasting',
        timestamp: am.cast.timestamp,
      };
    }

    if (!this.hasOrbMastery) {
      return {
        performance: QualitativePerformance.Perfect,
        reason: 'Cast with Clearcasting and without Orb Mastery',
        timestamp: am.cast.timestamp,
      };
    }

    if (this.hasHighVoltage && am.arcaneCharges < 3) {
      return {
        performance: QualitativePerformance.Perfect,
        reason: `Had ${am.arcaneCharges} with High Voltage`,
        timestamp: am.cast.timestamp,
      };
    }

    if (this.hasOverpoweredMissiles && am.opMissiles) {
      return {
        performance: QualitativePerformance.Perfect,
        reason: 'Had Overpowered Missiles',
        timestamp: am.cast.timestamp,
      };
    }

    // GOOD CONDITIONS
    if (am.clearcastingProcs > 0) {
      return {
        performance: QualitativePerformance.Good,
        reason: 'Had Clearcasting',
        timestamp: am.cast.timestamp,
      };
    }

    // DEFAULT
    return {
      performance: QualitativePerformance.Ok,
      reason: am.channelEndDelay
        ? `Standard usage - ${formatDurationMillisMinSec(am.channelEndDelay, 3)} delay to next cast`
        : 'Standard Arcane Missiles usage',
      timestamp: am.cast.timestamp,
    };
  }

  get guideSubsection(): JSX.Element {
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const arcaneMissiles = <SpellLink spell={TALENTS.ARCANE_MISSILES_TALENT} />;
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;
    const orbMastery = <SpellLink spell={TALENTS.ORB_MASTERY_TALENT} />;
    const highVoltage = <SpellLink spell={TALENTS.HIGH_VOLTAGE_TALENT} />;
    const overpoweredMissiles = <SpellLink spell={TALENTS.OVERPOWERED_MISSILES_TALENT} />;

    const explanation = (
      <>
        <b>{arcaneMissiles}</b> is a rotational ability that provides several benefits and are
        modified by various buffs and talents. In general, you should only cast {arcaneMissiles}{' '}
        when you both have a {clearcasting} proc and one of the below conditions is true;
        <ul>
          <li>You are capped on {clearcasting} procs.</li>
          <li>You do not have the {orbMastery} talent</li>
          <li>
            You are talented into {highVoltage} and have less than 3 {arcaneCharge}s
          </li>
          <li>You have an {overpoweredMissiles} proc.</li>
        </ul>
        Additionally, while it is sometimes acceptable to end your {arcaneMissiles} channel early,
        you should never end it before the GCD has finished.
      </>
    );

    return (
      <GuideSection spell={TALENTS.ARCANE_MISSILES_TALENT} explanation={explanation}>
        <CastOverview spell={TALENTS.ARCANE_MISSILES_TALENT} stats={this.buildOverviewStats()} />
        <CastSummary
          spell={TALENTS.ARCANE_MISSILES_TALENT}
          casts={this.arcaneMissiles.missileData.map((cast) => this.evaluateMissilesCast(cast))}
          showBreakdown
        />
      </GuideSection>
    );
  }
}

export default ArcaneMissilesGuide;
