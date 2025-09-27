import { SpellLink, SpellIcon, TooltipElement } from 'interface';
import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import { PerformanceBoxRow, BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import {
  CastEfficiencyBarElement,
  CastEfficiencyStatElement,
} from 'interface/guide/components/CastEfficiencyPanel';
import { qualitativePerformanceToColor } from 'interface/guide';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../arcane/Guide';
import UptimeStackBar from 'parser/ui/UptimeStackBar';
import { formatPercentage } from 'common/format';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import Spell from 'common/SPELLS/Spell';

/**
 * Interface for WoWAnalyzer module instances that can format timestamps
 */
export interface TimestampFormatter {
  formatTimestamp: (timestamp: number) => string;
}

/**
 * Reusable UI components commonly used in guide implementations.
 * These components encapsulate common patterns to reduce code duplication.
 */
export class GuideComponents {
  /**
   * Creates a standardized guide subsection with flexible data components.
   * Use this for all guide subsections to maintain consistency.
   *
   * @param explanation - JSX explanation content
   * @param dataComponents - Array of data components to display
   * @param title - Title for the subsection
   * @returns Complete guide subsection JSX
   */
  static createSubsection(
    explanation: JSX.Element,
    dataComponents: JSX.Element[],
    title: string,
  ): JSX.Element {
    const data = (
      <RoundedPanel>
        <div>
          {dataComponents.map((component, index) => (
            <div
              key={index}
              style={{ marginBottom: index < dataComponents.length - 1 ? '15px' : '0' }}
            >
              {component}
            </div>
          ))}
        </div>
      </RoundedPanel>
    );

    return explanationAndDataSubsection(explanation, data, GUIDE_CORE_EXPLANATION_PERCENT, title);
  }

  // ===== DATA COMPONENTS =====

  /**
   * Per Cast Summary Component - Shows performance breakdown for each cast
   * Used by: Arcane Barrage, Arcane Missiles, etc.
   */
  static createPerCastSummary(spell: Spell, castEntries: BoxRowEntry[]): JSX.Element {
    return (
      <div>
        <CastSummaryAndBreakdown spell={spell} castEntries={castEntries} />
      </div>
    );
  }

  /**
   * Statistic Component - Shows a single performance statistic
   * Used by: Arcane Missiles (Average Delay), etc.
   */
  static createStatistic(
    spell: Spell,
    value: string,
    label: string,
    performance: QualitativePerformance,
    tooltip?: JSX.Element,
  ): JSX.Element {
    const spellIcon = <SpellIcon spell={spell} />;
    const content = (
      <span style={{ color: qualitativePerformanceToColor(performance), fontSize: '18px' }}>
        {spellIcon} {value} <small>{label}</small>
      </span>
    );

    const statContent = tooltip ? (
      <TooltipElement content={tooltip}>{content}</TooltipElement>
    ) : (
      content
    );

    return <div style={{ fontSize: '20px' }}>{statContent}</div>;
  }

  /**
   * Statistic Panel Component - Shows a statistic in a rounded panel (like TouchOfTheMagi active time)
   * Used by: Touch of the Magi (Active Time Summary), etc.
   */
  static createStatisticPanel(
    spell: Spell,
    value: string,
    label: string,
    performance: QualitativePerformance,
    tooltip?: JSX.Element,
  ): JSX.Element {
    const spellIcon = <SpellIcon spell={spell} />;
    const content = (
      <div
        style={{
          color: qualitativePerformanceToColor(performance),
          fontSize: '20px',
          textAlign: 'left',
        }}
      >
        {spellIcon} {value} <small>{label}</small>
      </div>
    );

    const statContent = tooltip ? (
      <TooltipElement content={tooltip}>{content}</TooltipElement>
    ) : (
      content
    );

    return <RoundedPanel>{statContent}</RoundedPanel>;
  }

  /**
   * Per Cast Breakdown Component - Shows detailed breakdown of each cast
   * Used by: Shifting Power, Touch of the Magi, Arcane Surge, etc.
   */
  static createPerCastBreakdown(castEntries: BoxRowEntry[], title: string): JSX.Element {
    return (
      <div>
        <strong>{title}</strong>
        <PerformanceBoxRow values={castEntries} />
        <small>green (good) / red (fail) mouseover the rectangles to see more details</small>
      </div>
    );
  }

  /**
   * Expandable Cast Breakdown Component - Shows detailed per-cast breakdown with expandable checklist
   * Used by: ArcaneSurge, TouchOfTheMagi, etc.
   */
  static createExpandableCastBreakdown(castBreakdowns: React.ReactNode[]): JSX.Element {
    return (
      <div style={{ margin: '-0.5em 0 0.25em 0' }}>
        <div style={{ marginBottom: '0.5em' }}>
          <strong>Per-Cast Breakdown</strong>
          <small> - click to expand</small>
        </div>
        {castBreakdowns.map((breakdown, index) => (
          <div
            key={index}
            style={{ marginBottom: index < castBreakdowns.length - 1 ? '0.5em' : '0' }}
          >
            {breakdown}
          </div>
        ))}
      </div>
    );
  }

  /**
   * Cooldown Timeline Component - Shows cooldown usage and efficiency
   * Used by: Arcane Orb, etc.
   */
  static createCooldownTimeline(
    spell: Spell,
    averageValue: string,
    averageLabel: string,
    missedCount: number,
    castEntries: BoxRowEntry[],
    title: string,
  ): JSX.Element {
    const spellIcon = <SpellIcon spell={spell} />;
    const tooltip = <>{missedCount} casts with issues.</>;

    return (
      <div>
        <div>
          <span style={{ fontSize: '18px' }}>
            {spellIcon}{' '}
            <TooltipElement content={tooltip}>
              {averageValue} <small>{averageLabel}</small>
            </TooltipElement>
          </span>
          {' / '}
          <CastEfficiencyStatElement spell={spell} useThresholds />
        </div>
        <div>
          <strong>{title}</strong>
          <PerformanceBoxRow values={castEntries} />
          <small>green (good) / red (fail) mouseover the rectangles to see more details</small>
        </div>
        <CastEfficiencyBarElement spell={spell} />
      </div>
    );
  }

  /**
   * Buff Uptime Graph Component - Shows buff uptime over time
   * Used by: Arcane Tempo, etc.
   */
  static createBuffUptimeGraph(
    spell: Spell,
    uptimePercentage: number,
    uptimeGraph?: JSX.Element,
  ): JSX.Element {
    return (
      <div>
        <div>
          <SpellIcon spell={spell} />{' '}
          <strong>
            {spell.name} Uptime: {uptimePercentage.toFixed(1)}%
          </strong>
        </div>
        {uptimeGraph && <div>{uptimeGraph}</div>}
      </div>
    );
  }

  /**
   * No Usage Component - Shows when a player didn't use an ability
   * Used when there's no data to analyze
   */
  static createNoUsageComponent(spell: Spell): JSX.Element {
    const spellLink = <SpellLink spell={spell} />;

    return (
      <div style={{ textAlign: 'center', fontSize: '20px' }}>
        <p>
          <strong>Player did not cast {spellLink}</strong>
        </p>
      </div>
    );
  }

  /**
   * Buff Stack Uptime Component - Shows stacked buff uptime over time with statistics
   * Used by: ArcaneTempo, etc.
   */
  static createBuffStackUptime(
    spell: Spell,
    uptimePercentage: number,
    averageStacks: number,
    stackUptimes: Array<{ start: number; end: number; stacks: number }>,
    overallUptimes: Array<{ start: number; end: number }>,
    fightStart: number,
    fightEnd: number,
    maxStacks: number,
    barColor: string,
    backgroundBarColor: string,
    averageStacksTooltip?: string,
  ): JSX.Element {
    return (
      <div>
        <strong>{spell.name} Uptime</strong>
        <div className="flex-main multi-uptime-bar">
          <div className="flex main-bar-big">
            <div className="flex-sub bar-label">
              <SpellIcon spell={spell} />{' '}
              <span style={{ color: backgroundBarColor }}>
                {formatPercentage(uptimePercentage, 0)}% <small>active</small>
              </span>
              <br />
              <TooltipElement
                content={
                  averageStacksTooltip ||
                  `This is the average number of stacks you had over the course of the fight, counting periods where you didn't have the buff as zero stacks.`
                }
              >
                <span style={{ color: barColor }}>
                  {averageStacks.toFixed(1)} <small>avg stacks</small>
                </span>
              </TooltipElement>
            </div>
            <div className="flex-main chart">
              <UptimeStackBar
                stackUptimeHistory={stackUptimes}
                start={fightStart}
                end={fightEnd}
                maxStacks={maxStacks}
                barColor={barColor}
                backgroundHistory={overallUptimes}
                backgroundBarColor={backgroundBarColor}
                timeTooltip
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
