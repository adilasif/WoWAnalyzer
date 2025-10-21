import { ReactNode } from 'react';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import Analyzer from 'parser/core/Analyzer';
import {
  MageGuideSection,
  CastOverview,
  CooldownTimeline,
  type CastOverviewEntry,
  type CastOverviewDetail,
  type OverviewStat,
} from '../../shared/components';
import { evaluateQualitativePerformanceByThreshold } from 'parser/ui/QualitativePerformance';

import ArcaneOrb from '../analyzers/ArcaneOrb';

interface ArcaneOrbCast {
  timestamp: number;
  targetsHit: number;
  chargesBefore: number;
}

const ORB_EFFICIENT_CHARGE_THRESHOLD = 2;
const AOE_THRESHOLD = 2; // Perfect if hitting 2+ targets

class ArcaneOrbGuide extends Analyzer {
  static dependencies = {
    arcaneOrb: ArcaneOrb,
  };

  protected arcaneOrb!: ArcaneOrb;

  /**
   * Evaluates a single Arcane Orb cast for CastOverview.
   * Returns complete cast information including performance, details, and notes.
   */
  private evaluateOrbCast(cast: ArcaneOrbCast): CastOverviewEntry {
    const hitTargets = cast.targetsHit > 0;
    const efficientCharges = cast.chargesBefore <= ORB_EFFICIENT_CHARGE_THRESHOLD;
    const multiTarget = cast.targetsHit >= AOE_THRESHOLD;

    // Determine overall performance
    let performance: QualitativePerformance;
    let notes: ReactNode;

    // Fail conditions
    if (!hitTargets) {
      performance = QualitativePerformance.Fail;
      notes = 'Failed to hit any targets - wasted cast';
    } else if (!efficientCharges) {
      performance = QualitativePerformance.Fail;
      notes = (
        <>
          Inefficient usage - already had {cast.chargesBefore}{' '}
          <SpellLink spell={SPELLS.ARCANE_CHARGE} />s (use at ≤{ORB_EFFICIENT_CHARGE_THRESHOLD}{' '}
          charges)
        </>
      );
    }
    // Perfect condition - hit multiple targets with efficient charges
    else if (hitTargets && efficientCharges && multiTarget) {
      performance = QualitativePerformance.Perfect;
      notes = (
        <>
          Perfect usage - {cast.targetsHit} targets hit with efficient charge usage (
          {cast.chargesBefore}/{ORB_EFFICIENT_CHARGE_THRESHOLD})
        </>
      );
    }
    // Good condition - hit target(s) with efficient charges
    else if (hitTargets && efficientCharges) {
      performance = QualitativePerformance.Good;
      notes = (
        <>
          Good usage - {cast.targetsHit} target(s) hit with efficient charge usage (
          {cast.chargesBefore}/{ORB_EFFICIENT_CHARGE_THRESHOLD})
        </>
      );
    }
    // Default fallback
    else {
      performance = QualitativePerformance.Fail;
      notes = 'Arcane Orb usage needs improvement';
    }

    // Build details array
    const details: CastOverviewDetail[] = [];

    // Targets Hit
    const targetsPerformance = multiTarget
      ? QualitativePerformance.Perfect
      : hitTargets
        ? QualitativePerformance.Good
        : QualitativePerformance.Fail;

    details.push({
      label: 'Targets Hit',
      value: cast.targetsHit,
      performance: targetsPerformance,
      tooltip:
        cast.targetsHit >= AOE_THRESHOLD
          ? 'Great AoE value!'
          : cast.targetsHit > 0
            ? 'Hit at least one target'
            : 'Missed all targets',
    });

    // Charges Before Cast
    const chargesPerformance = efficientCharges
      ? QualitativePerformance.Perfect
      : QualitativePerformance.Fail;

    details.push({
      label: 'Charges Before',
      value: `${cast.chargesBefore} / ${ORB_EFFICIENT_CHARGE_THRESHOLD}`,
      performance: chargesPerformance,
      tooltip: efficientCharges
        ? 'Efficient - used with low charges'
        : `Too many charges (${cast.chargesBefore}) - should use at ≤${ORB_EFFICIENT_CHARGE_THRESHOLD}`,
    });

    // Charges Generated (always 2 minimum)
    const chargesGenerated = Math.max(2, cast.targetsHit);
    details.push({
      label: 'Charges Generated',
      value: chargesGenerated,
      tooltip: 'Arcane Orb generates 2 charges minimum, +1 per additional target hit',
    });

    return {
      timestamp: cast.timestamp,
      performance,
      details,
      notes,
    };
  }

  /**
   * Build overview statistics for the summary card
   */
  private get overviewStats(): OverviewStat[] {
    const stats: OverviewStat[] = [];

    // Total Casts
    stats.push({
      label: 'Total Casts',
      value: this.arcaneOrb.orbData.length,
      tooltip: 'Number of Arcane Orb casts during the encounter',
    });

    // Average Targets Hit
    const avgTargetsHit = this.arcaneOrb.averageHitsPerCast;
    const avgTargetsPerf = evaluateQualitativePerformanceByThreshold({
      actual: avgTargetsHit,
      isGreaterThan: {
        perfect: 2.0,
        good: 1.5,
        ok: 1.0,
        fail: 0,
      },
    });

    stats.push({
      label: 'Avg Targets Hit',
      value: avgTargetsHit.toFixed(2),
      performance: avgTargetsPerf,
      tooltip: 'Average number of targets hit per Arcane Orb cast',
    });

    // Perfect Casts
    const perfectCasts = this.arcaneOrb.orbData.filter((cast) => {
      const evaluation = this.evaluateOrbCast(cast);
      return evaluation.performance === QualitativePerformance.Perfect;
    }).length;

    stats.push({
      label: 'Perfect Casts',
      value: `${perfectCasts} / ${this.arcaneOrb.orbData.length}`,
      performance:
        perfectCasts === this.arcaneOrb.orbData.length
          ? QualitativePerformance.Perfect
          : perfectCasts >= this.arcaneOrb.orbData.length / 2
            ? QualitativePerformance.Good
            : QualitativePerformance.Ok,
      tooltip: 'Casts with 2+ targets hit and efficient charge usage',
    });

    // Wasted Casts (missed or inefficient)
    const wastedCasts = this.arcaneOrb.orbData.filter((cast) => {
      const evaluation = this.evaluateOrbCast(cast);
      return evaluation.performance === QualitativePerformance.Fail;
    }).length;

    if (wastedCasts > 0) {
      stats.push({
        label: 'Wasted Casts',
        value: wastedCasts,
        performance: QualitativePerformance.Fail,
        tooltip: 'Casts that missed targets or were used with too many charges',
      });
    }

    // Total Charges Generated
    const totalChargesGenerated = this.arcaneOrb.orbData.reduce((total, cast) => {
      return total + Math.max(2, cast.targetsHit);
    }, 0);

    stats.push({
      label: 'Total Charges Generated',
      value: totalChargesGenerated,
      tooltip: 'Total Arcane Charges generated from all Arcane Orb casts',
    });

    return stats;
  }

  get guideSubsection(): JSX.Element {
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;

    const explanation = (
      <>
        <b>{arcaneOrb}</b> primary purpose is to quickly generate {arcaneCharge}s, as it is an
        instant that generates at least 2 charges per cast, with an additional charge per target
        hit.
        <ul>
          <li>
            Try to use it on cooldown, but only when you have 2 or fewer {arcaneCharge}s to avoid
            overcapping.
          </li>
          <li>
            In multi-target situations, position yourself to hit as many targets as possible for
            maximum charge generation.
          </li>
          <li>Perfect usage combines efficient charge management with hitting multiple targets.</li>
        </ul>
      </>
    );

    if (this.arcaneOrb.orbData.length === 0) {
      return (
        <MageGuideSection
          spell={SPELLS.ARCANE_ORB}
          explanation={explanation}
          title="Arcane Orb (Overview)"
        >
          <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
            No Arcane Orb casts recorded
          </div>
        </MageGuideSection>
      );
    }

    return (
      <MageGuideSection
        spell={SPELLS.ARCANE_ORB}
        explanation={explanation}
        title="Arcane Orb (Overview)"
      >
        <CastOverview
          spell={SPELLS.ARCANE_ORB}
          stats={this.overviewStats}
          casts={this.arcaneOrb.orbData.map((cast) => this.evaluateOrbCast(cast))}
        />
        <CooldownTimeline spell={SPELLS.ARCANE_ORB} />
      </MageGuideSection>
    );
  }
}

export default ArcaneOrbGuide;
