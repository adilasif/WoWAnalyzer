import type { JSX } from 'react';
import { formatDurationMillisMinSec, formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import Analyzer from 'parser/core/Analyzer';
import CastSummary, { type CastEvaluation } from 'interface/guide/components/CastSummary';
import GuideSection from 'interface/guide/components/GuideSection';
import { GetRelatedEvent } from 'parser/core/Events';

import CombustionCasts from '../core/Combustion';

class CombustionGuide extends Analyzer {
  static dependencies = {
    combustion: CombustionCasts,
  };

  protected combustion!: CombustionCasts;

  hasFlameAccelerant: boolean = this.selectedCombatant.hasTalent(TALENTS.FLAME_ACCELERANT_TALENT);

  /**
   * Evaluates a single Combustion cast for CastSummary.
   * Returns performance and reason for tooltip display.
   *
   * Evaluation priority: fail → perfect → good → ok
   */
  private evaluateCombustionCast(cb: any): CastEvaluation {
    const combustDuration = cb.remove - cb.cast.timestamp;
    const activeTimePercent = cb.activeTime / combustDuration;

    const activeThresholds = this.combustion.activeTimeThresholds.isLessThan;
    const delayThresholds = this.combustion.combustionCastDelayThresholds.isGreaterThan;

    // Check for hardcast Fireballs during Combustion (fail)
    const fireballCasts = cb.spellCasts.filter((sc: any) => {
      if (sc.ability.guid !== SPELLS.FIREBALL.id) {
        return false;
      }
      const beginCast = GetRelatedEvent(sc, 'CastBegin');
      const hasAccelerantBuff = this.selectedCombatant.hasBuff(
        SPELLS.FLAME_ACCELERANT_BUFF.id,
        sc.timestamp,
      );
      if (
        this.selectedCombatant.hasBuff(TALENTS.COMBUSTION_TALENT.id, beginCast?.timestamp) &&
        !hasAccelerantBuff
      ) {
        return true;
      }
      return false;
    });

    // FAIL CONDITIONS
    if (fireballCasts.length > 0) {
      return {
        timestamp: cb.cast.timestamp,
        performance: QualitativePerformance.Fail,
        reason: `${fireballCasts.length} Hardcast Fireball(s) during Combustion - significant DPS loss`,
      };
    }

    if (activeTimePercent < activeThresholds.major) {
      return {
        timestamp: cb.cast.timestamp,
        performance: QualitativePerformance.Fail,
        reason: `Low Active Time: ${formatPercentage(activeTimePercent, 1)}% (${formatDurationMillisMinSec(cb.activeTime, 1)} / ${formatDurationMillisMinSec(combustDuration, 1)})`,
      };
    }

    if (cb.castDelay > delayThresholds.major) {
      return {
        timestamp: cb.cast.timestamp,
        performance: QualitativePerformance.Fail,
        reason: `High Cast Delay: ${formatDurationMillisMinSec(cb.castDelay, 2)} - wasted Combustion duration`,
      };
    }

    // PERFECT CONDITIONS
    if (activeTimePercent >= activeThresholds.minor && cb.castDelay <= delayThresholds.minor) {
      return {
        timestamp: cb.cast.timestamp,
        performance: QualitativePerformance.Perfect,
        reason: `Perfect - ${formatPercentage(activeTimePercent, 1)}% Active Time, ${formatDurationMillisMinSec(cb.castDelay, 2)} Cast Delay`,
      };
    }

    // GOOD CONDITIONS
    if (activeTimePercent >= activeThresholds.average && cb.castDelay <= delayThresholds.average) {
      return {
        timestamp: cb.cast.timestamp,
        performance: QualitativePerformance.Good,
        reason: `Good - ${formatPercentage(activeTimePercent, 1)}% Active Time, ${formatDurationMillisMinSec(cb.castDelay, 2)} Cast Delay`,
      };
    }

    // OK CONDITIONS
    return {
      timestamp: cb.cast.timestamp,
      performance: QualitativePerformance.Ok,
      reason: `Ok - ${formatPercentage(activeTimePercent, 1)}% Active Time, ${formatDurationMillisMinSec(cb.castDelay, 2)} Cast Delay`,
    };
  }

  get guideSubsection(): JSX.Element {
    const fireBlast = <SpellLink spell={SPELLS.FIRE_BLAST} />;
    const combustion = <SpellLink spell={TALENTS.COMBUSTION_TALENT} />;
    const hotStreak = <SpellLink spell={SPELLS.HOT_STREAK} />;
    const scorch = <SpellLink spell={SPELLS.SCORCH} />;
    const fireball = <SpellLink spell={SPELLS.FIREBALL} />;
    const pyroblast = <SpellLink spell={TALENTS.PYROBLAST_TALENT} />;
    const flamestrike = <SpellLink spell={SPELLS.FLAMESTRIKE} />;
    const flameAccelerant = <SpellLink spell={TALENTS.FLAME_ACCELERANT_TALENT} />;
    const feelTheBurn = <SpellLink spell={TALENTS.FEEL_THE_BURN_TALENT} />;

    const explanation = (
      <>
        <b>{combustion}</b> is a very strong burst cooldown with a short duration. To maximize your
        burst, use as many instant casts as possible to maximize {hotStreak}s gained and spent
        before {combustion} ends.
        <ul>
          <li>
            Cast {combustion} as close to the end of your hardcast as possible to avoid wasting buff
            duration (Cast Delay).
          </li>
          <li>
            Pool {fireBlast} charges before {combustion} so you have enough to last its duration.
          </li>
          <li>
            Spend as many {hotStreak}s as possible during {combustion} and avoid any downtime.
          </li>
          <li>
            Don't hardcast {fireball} (
            {this.hasFlameAccelerant ? `without ${flameAccelerant}` : `with > 100% Haste`}),{' '}
            {pyroblast}, or {flamestrike} during {combustion}. Use {scorch} if running low on
            charges.
          </li>
          {this.selectedCombatant.hasTalent(TALENTS.FEEL_THE_BURN_TALENT) && (
            <li>
              Get max stacks of {feelTheBurn} and maintain it for {combustion}'s duration.
            </li>
          )}
        </ul>
      </>
    );

    return (
      <GuideSection spell={TALENTS.COMBUSTION_TALENT} explanation={explanation}>
        <CastSummary
          spell={TALENTS.COMBUSTION_TALENT}
          casts={this.combustion.combustCasts.map((cast) => this.evaluateCombustionCast(cast))}
          showBreakdown
        />
      </GuideSection>
    );
  }
}

export default CombustionGuide;
