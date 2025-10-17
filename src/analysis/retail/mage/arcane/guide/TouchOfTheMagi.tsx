import { formatPercentage, formatDuration } from 'common/format';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { SpellSeq } from 'parser/ui/SpellSeq';
import { AnyEvent } from 'parser/core/Events';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { isApplicableEvent } from 'interface/report/Results/Timeline/Casts';
import { evaluateQualitativePerformanceByThreshold } from 'parser/ui/QualitativePerformance';
import TouchOfTheMagi, { TouchOfTheMagiData } from '../analyzers/TouchOfTheMagi';

import {
  type ExpandableConfig,
  type CastEvaluation,
  type CastTimelineEntry,
  MageGuideSection,
  CastTimeline,
  ExpandableBreakdown,
  InlineStatistic,
  createExpandableConfig,
} from '../../shared/components';

const MAX_ARCANE_CHARGES = 4;
const TOUCH_WINDOW_BUFFER_MS = 7500; // 7.5 seconds before and after

class TouchOfTheMagiGuide extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
    touchOfTheMagi: TouchOfTheMagi,
  };

  protected touchOfTheMagi!: TouchOfTheMagi;

  activeTimeUtil(activePercent: number) {
    const thresholds = this.touchOfTheMagi.touchMagiActiveTimeThresholds.isLessThan;
    return evaluateQualitativePerformanceByThreshold({
      actual: activePercent,
      isGreaterThan: {
        perfect: thresholds.minor,
        good: thresholds.average,
        ok: thresholds.major,
        fail: 0,
      },
    });
  }

  get expandableConfig(): ExpandableConfig {
    return createExpandableConfig({
      spell: TALENTS.TOUCH_OF_THE_MAGI_TALENT,
      formatTimestamp: (timestamp: number) => this.owner.formatTimestamp(timestamp),
      getTimestamp: (cast: unknown) => (cast as TouchOfTheMagiData).applied,
      checklistItems: [
        {
          label: (
            <>
              <SpellLink spell={SPELLS.ARCANE_CHARGE} />s Before Touch
            </>
          ),
          getResult: (cast: unknown) => {
            const touchCast = cast as TouchOfTheMagiData;
            const noCharges = touchCast.charges === 0;
            const maxCharges = touchCast.charges === MAX_ARCANE_CHARGES;
            return noCharges || (maxCharges && touchCast.refundBuff);
          },
          getDetails: (cast: unknown) => {
            const touchCast = cast as TouchOfTheMagiData;
            return `${touchCast.charges} charges ${touchCast.refundBuff ? '(Refund)' : ''}`;
          },
        },
        {
          label: (
            <>
              Active Time during <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />
            </>
          ),
          getResult: (cast: unknown) => {
            const touchCast = cast as TouchOfTheMagiData;
            const activeTime = touchCast.activeTime || 0;
            const activeTimePerf = this.activeTimeUtil(activeTime) as QualitativePerformance;
            return activeTimePerf !== QualitativePerformance.Fail;
          },
          getDetails: (cast: unknown) => {
            const touchCast = cast as TouchOfTheMagiData;
            return `${formatPercentage(touchCast.activeTime || 0, 1)}% active time`;
          },
        },
      ],
    });
  }

  /**
   * Evaluates a single Touch of the Magi cast for ExpandableBreakdown.
   * Returns performance and reason for tooltip display.
   *
   * Evaluation priority: fail → perfect → good → ok → default
   */
  private evaluateTouchCast(cast: TouchOfTheMagiData): CastEvaluation {
    const noCharges = cast.charges === 0;
    const maxCharges = cast.charges === MAX_ARCANE_CHARGES;
    const activeTime = cast.activeTime || 0;
    const activeTimePerf = this.activeTimeUtil(activeTime) as QualitativePerformance;
    const correctCharges = noCharges || (maxCharges && cast.refundBuff);

    // Fail conditions (highest priority)
    if (!correctCharges) {
      return {
        timestamp: cast.applied,
        performance: QualitativePerformance.Fail,
        reason: `Wrong charge count (${cast.charges}) - should have 0 or 4 charges with refund buff`,
      };
    }

    if (activeTimePerf === QualitativePerformance.Fail) {
      return {
        timestamp: cast.applied,
        performance: QualitativePerformance.Fail,
        reason: `Very low active time (${formatPercentage(activeTime, 1)}%) - need to cast more during Touch window`,
      };
    }

    // Perfect conditions
    if (correctCharges && activeTimePerf === QualitativePerformance.Perfect) {
      return {
        timestamp: cast.applied,
        performance: QualitativePerformance.Perfect,
        reason: `Perfect usage: correct charges (${cast.charges}) + excellent active time (${formatPercentage(activeTime, 1)}%)`,
      };
    }

    // Good conditions
    if (correctCharges && activeTimePerf === QualitativePerformance.Good) {
      return {
        timestamp: cast.applied,
        performance: QualitativePerformance.Good,
        reason: `Good usage: correct charges (${cast.charges}) + good active time (${formatPercentage(activeTime, 1)}%)`,
      };
    }

    // Ok conditions
    if (correctCharges && activeTimePerf === QualitativePerformance.Ok) {
      return {
        timestamp: cast.applied,
        performance: QualitativePerformance.Ok,
        reason: `Acceptable: correct charges (${cast.charges}) but could improve active time (${formatPercentage(activeTime, 1)}%)`,
      };
    }

    // Default fallback
    return {
      timestamp: cast.applied,
      performance: QualitativePerformance.Fail,
      reason: `Suboptimal Touch usage: ${cast.charges} charges, ${formatPercentage(activeTime, 1)}% active time`,
    };
  }

  get guideSubsection(): JSX.Element {
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;
    const siphonStorm = <SpellLink spell={SPELLS.SIPHON_STORM_BUFF} />;
    const evocation = <SpellLink spell={TALENTS.EVOCATION_TALENT} />;
    const arcaneBlast = <SpellLink spell={SPELLS.ARCANE_BLAST} />;
    const arcaneSurge = <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} />;
    const presenceOfMind = <SpellLink spell={TALENTS.PRESENCE_OF_MIND_TALENT} />;
    const burdenOfPower = <SpellLink spell={TALENTS.BURDEN_OF_POWER_TALENT} />;
    const gloriousIncandescence = <SpellLink spell={TALENTS.GLORIOUS_INCANDESCENCE_TALENT} />;

    const explanation = (
      <>
        <b>{touchOfTheMagi}</b> is a short debuff available for each burn phase and grants you 4{' '}
        {arcaneCharge}s and accumulates 20% of your damage for the duration. When the debuff expires
        it explodes dealing damage to the target and reduced damage to nearby targets.
        <ul>
          <li>
            Using the standard rotation, cast as many spells as possible at the debuffed target
            until the debuff expires.
          </li>
          <li>
            Spend your {arcaneCharge}s with {arcaneBarrage} and then cast {touchOfTheMagi} while{' '}
            {arcaneBarrage}
            is in the air for some extra damage. cast
            {touchOfTheMagi} while {arcaneBarrage} is in the air. This should be done even if your
            charges will be refunded anyway via {burdenOfPower}, {gloriousIncandescence}, or .
          </li>
          <li>
            Major Burn Phase: Ensure you have {siphonStorm} and . Your cast sequence would typically
            be{' '}
            <SpellSeq
              spells={[
                TALENTS.EVOCATION_TALENT,
                TALENTS.ARCANE_MISSILES_TALENT,
                TALENTS.ARCANE_SURGE_TALENT,
                SPELLS.ARCANE_BARRAGE,
                TALENTS.TOUCH_OF_THE_MAGI_TALENT,
              ]}
            />
            . If you don't have 4 {arcaneCharge}s, cast {arcaneOrb} before {arcaneSurge}.
          </li>
          <li>
            Minor Burn Phase: {evocation} and {arcaneSurge} will not be available, but if possible
            you should go into {touchOfTheMagi} with .
          </li>
          <li>
            Use {presenceOfMind} at the end of {touchOfTheMagi} to squeeze in a couple more{' '}
            {arcaneBlast} casts.
          </li>
        </ul>
      </>
    );

    const activeTimeTooltip = (
      <>
        {formatPercentage(this.touchOfTheMagi.averageActiveTime)}% average Active Time per Touch of
        the Magi cast.
      </>
    );

    const activeTimePerf = this.activeTimeUtil(this.touchOfTheMagi.averageActiveTime);

    // Get all applicable events for each Touch of the Magi window
    const playerFilter = isApplicableEvent(this.selectedCombatant.id);
    const touchTimelineEvents: CastTimelineEntry<TouchOfTheMagiData>[] =
      this.touchOfTheMagi.touchData.map((cast) => {
        const windowStart = cast.applied - TOUCH_WINDOW_BUFFER_MS;
        const windowEnd = cast.applied + TOUCH_WINDOW_BUFFER_MS;

        // Filter owner.eventHistory for all applicable timeline events (Cast, BeginChannel, EndChannel, GlobalCooldown, etc.)
        const events = this.owner.eventHistory.filter(
          (event: AnyEvent) =>
            event.timestamp >= windowStart && event.timestamp <= windowEnd && playerFilter(event),
        );

        return {
          data: cast,
          start: windowStart,
          end: windowEnd,
          casts: events,
        };
      });

    return (
      <MageGuideSection spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} explanation={explanation}>
        <InlineStatistic
          value={`${formatPercentage(this.touchOfTheMagi.averageActiveTime)}%`}
          label="Average Active Time"
          tooltip={activeTimeTooltip}
          performance={activeTimePerf}
        />
        <ExpandableBreakdown
          castData={this.touchOfTheMagi.touchData}
          evaluatedData={this.touchOfTheMagi.touchData.map((cast) => {
            const evaluation = this.evaluateTouchCast(cast);
            return {
              value: evaluation.performance,
              tooltip: evaluation.reason,
            };
          })}
          expandableConfig={this.expandableConfig}
        />
        <CastTimeline
          spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT}
          events={touchTimelineEvents}
          windowDescription="Casts 5 seconds before and after Touch of the Magi"
          castTimestamp={(data) => formatDuration(data.applied - this.owner.fight.start_time)}
        />
      </MageGuideSection>
    );
  }
}

export default TouchOfTheMagiGuide;
