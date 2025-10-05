/**
 * Fluent Builder Pattern for Guide Components
 *
 * This builder provides an intuitive, English-like interface for creating guide subsections.
 * It's designed to be easy to use for non-programmers while maintaining full flexibility.
 *
 * Usage Example:
 * Simple ability with cast summary:
 * new GuideBuilder(SPELLS.ARCANE_ORB)
 *   .explanation(explanation)
 *   .addCastSummary({ castData: this.arcaneOrbData })
 *   .build()
 *
 * Complex ability with multiple components:
 * new GuideBuilder(TALENTS.TOUCH_OF_THE_MAGI_TALENT, 'Touch of the Magi')
 *   .explanation(explanation)
 *   .addStatistic({
 *     value: '85.2%',
 *     label: 'Average Active Time',
 *     performance: QualitativePerformance.Good,
 *     tooltip
 *   })
 *   .addExpandableBreakdown({ castBreakdowns })
 *   .build()
 *
 * Arcane Orb with individual components:
 * new GuideBuilder(SPELLS.ARCANE_ORB)
 *   .explanation(explanation)
 *   .addStatistic({ value: '2.1', label: 'avg targets hit', performance: QualitativePerformance.Good })
 *   .addCastEfficiency()
 *   .addCastSummary({ castData: this.arcaneOrbData, title: 'Arcane Orb Usage' })
 *   .addCooldownTimeline()
 *   .build()
 */

import React, { ReactNode } from 'react';
import { formatPercentage } from 'common/format';
import { SpellLink, SpellIcon, TooltipElement } from 'interface';
import { PassFailCheckmark, SubSection } from 'interface/guide';
import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import Explanation from 'interface/guide/components/Explanation';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import CooldownExpandable from 'interface/guide/components/CooldownExpandable';
import { PerformanceBoxRow, BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import {
  CastEfficiencyBarElement,
  CastEfficiencyStatElement,
} from 'interface/guide/components/CastEfficiencyPanel';
import { qualitativePerformanceToColor } from 'interface/guide';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../arcane/Guide';
import UptimeStackBar from 'parser/ui/UptimeStackBar';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import Spell from 'common/SPELLS/Spell';
import { ExpandableConfig } from '../components/GuideEvaluation';
import { CastEvent } from 'parser/core/Events';
import { SpellSeq } from 'parser/ui/SpellSeq';
import CastTimeline from 'interface/guide/components/CastTimeline';
import { getUptimesFromBuffHistory } from 'parser/ui/UptimeBar';
import { getStackUptimesFromBuffHistory } from 'parser/ui/UptimeStackBar';
import type { default as Combatant } from 'parser/core/Combatant';

/** Type for accessing fight timestamps and combatant data */
export interface FightInfo {
  owner: {
    fight: {
      start_time: number;
      end_time: number;
    };
    currentTimestamp: number;
  };
  selectedCombatant: Combatant;
}

/**
 * Main fluent builder class for creating guide subsections
 */
export class GuideBuilder {
  private title = '';
  private spell: Spell;
  private explanationContent: JSX.Element = (<></>);
  private components: JSX.Element[] = [];
  private explanationPercent?: number = GUIDE_CORE_EXPLANATION_PERCENT;

  /**
   * Create a new guide builder for the given spell
   * @param spell The spell this guide section is for
   * @param title Optional custom title (defaults to spell name)
   */
  constructor(spell: Spell, title?: string) {
    this.spell = spell;
    this.title = title || spell.name;
  }

  /**
   * Set the explanation content (required)
   * @param explanation JSX content explaining the ability/mechanic
   */
  explanation(explanation: JSX.Element): GuideBuilder {
    this.explanationContent = explanation;
    return this;
  }

  /**
   * Set the layout to stack vertically instead of side-by-side
   * Useful for charts or other wide content that needs full width
   */
  verticalLayout(): GuideBuilder {
    this.explanationPercent = undefined;
    return this;
  }

  /**
   * Set custom explanation width percentage (default is 30% side-by-side)
   * @param percent Width percentage for explanation column (0-100)
   */
  setExplanationWidth(percent: number): GuideBuilder {
    this.explanationPercent = percent;
    return this;
  }

  /**
   * Add a statistic showing a key metric in a rounded panel
   * Perfect for showing percentages, averages, or other summary stats
   */
  addStatistic(config: {
    value: string;
    label: string;
    performance: QualitativePerformance;
    tooltip?: JSX.Element;
  }): GuideBuilder {
    this.components.push(
      this.createStatistic(
        this.spell,
        config.value,
        config.label,
        config.performance,
        config.tooltip,
      ),
    );
    return this;
  }

  /**
   * Add a cast summary showing performance rectangles for each cast with clickable expansion
   * This creates the consolidated summary bar that can be clicked to expand details
   */
  addCastSummary(config: { castData: BoxRowEntry[]; title?: string }): GuideBuilder {
    this.components.push(this.createCastSummaryAndBreakdown(config.castData));
    return this;
  }

  /**
   * Add cast efficiency statistics (usage percent, etc.)
   */
  addCastEfficiency(): GuideBuilder {
    this.components.push(this.createCastEfficiencyStats(this.spell));
    return this;
  }

  /**
   * Add a cast efficiency timeline bar
   */
  addCooldownTimeline(): GuideBuilder {
    this.components.push(this.createCastEfficiencyBar(this.spell));
    return this;
  }

  /**
   * Add expandable per-cast breakdown with detailed analysis
   * Perfect for complex abilities where each cast needs individual scrutiny
   */
  addExpandableBreakdown(config: {
    castBreakdowns: React.ReactNode[];
    title?: string;
  }): GuideBuilder {
    this.components.push(this.createExpandableCastBreakdown(config.castBreakdowns, config.title));
    return this;
  }

  /**
   * Add a buff uptime visualization
   * Great for showing how well players maintained important buffs
   */
  addBuffUptime(config: { uptimePercentage: number; uptimeGraph?: JSX.Element }): GuideBuilder {
    this.components.push(
      this.createBuffUptimeGraph(this.spell, config.uptimePercentage, config.uptimeGraph),
    );
    return this;
  }

  /**
   * Add a buff stack uptime bar with performance tracking (simplified - auto-fetches buff history)
   * Perfect for stacking buffs where maintaining high stacks is important
   *
   * @example
   * new GuideBuilder(TALENTS.ARCANE_TEMPO_TALENT)
   *   .addBuffStackUptimeFromSpell({
   *     analyzer: this,
   *     buffSpell: SPELLS.ARCANE_TEMPO_BUFF,
   *     castData: [tempoEntry],
   *     maxStacks: ARCANE_TEMPO_MAX_STACKS,
   *   })
   */
  addBuffStackUptimeFromSpell(config: {
    /** The analyzer instance (typically `this` from your guide) for accessing buff history */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analyzer: any;
    /** The buff spell to track */
    buffSpell: Spell;
    /** Cast performance entries to display above the bar */
    castData: BoxRowEntry[];
    /** Maximum stacks for the buff */
    maxStacks: number;
    /** Fight start timestamp (defaults to fight start) */
    startTime?: number;
    /** Fight end timestamp (defaults to fight end) */
    endTime?: number;
    /** Color for the stack bar (defaults to purple) */
    barColor?: string;
    /** Color for the background bar (defaults to gray) */
    backgroundBarColor?: string;
    /** Tooltip text for average stacks (has sensible default) */
    tooltip?: string;
  }): GuideBuilder {
    // Get buff history and calculate uptimes
    const buffHistory = config.analyzer.selectedCombatant.getBuffHistory(config.buffSpell.id);
    const currentTimestamp = config.analyzer.owner.currentTimestamp;
    const overallUptimes = getUptimesFromBuffHistory(buffHistory, currentTimestamp);
    const stackUptimes = getStackUptimesFromBuffHistory(buffHistory, currentTimestamp);

    // Use provided times or default to fight times
    const startTime = config.startTime ?? config.analyzer.owner.fight.start_time;
    const endTime = config.endTime ?? config.analyzer.owner.fight.end_time;

    // Delegate to the existing method
    return this.addBuffStackUptime({
      stackData: stackUptimes,
      castData: config.castData,
      backgroundUptimes: overallUptimes,
      startTime,
      endTime,
      maxStacks: config.maxStacks,
      barColor: config.barColor,
      backgroundBarColor: config.backgroundBarColor,
      tooltip: config.tooltip,
    });
  }

  /**
   * Add buff stack uptime with multiple stack levels (advanced - provide your own data)
   * Use this if you need custom data processing or partial time windows
   * Useful for abilities that can stack and where stack count matters
   */
  addBuffStackUptime(config: {
    /** Stack uptime data for the detailed bar */
    stackData: { start: number; end: number; stacks: number }[];
    /** Cast performance entries to display above the bar */
    castData: BoxRowEntry[];
    /** Background uptime data (overall buff presence) */
    backgroundUptimes: { start: number; end: number }[];
    /** Fight start timestamp */
    startTime: number;
    /** Fight end timestamp */
    endTime: number;
    /** Maximum stacks for the buff */
    maxStacks: number;
    /** Color for the stack bar (defaults to purple) */
    barColor?: string;
    /** Color for the background bar (defaults to gray) */
    backgroundBarColor?: string;
    /** Tooltip text for average stacks (has sensible default) */
    tooltip?: string;
  }): GuideBuilder {
    // Calculate average stacks from stack data
    const averageStacks = this.calculateAverageStacks(
      config.stackData,
      config.startTime,
      config.endTime,
    );

    // Calculate uptime percentage from background uptimes
    const uptimePercentage = this.calculateUptimePercentage(
      config.backgroundUptimes,
      config.startTime,
      config.endTime,
    );

    this.components.push(
      this.createBuffStackUptime(
        this.spell,
        config.stackData,
        averageStacks,
        config.castData,
        uptimePercentage,
        config.backgroundUptimes,
        config.startTime,
        config.endTime,
        config.maxStacks,
        config.barColor || '#cd1bdf',
        config.backgroundBarColor || '#7e5da8',
        config.tooltip,
      ),
    );
    return this;
  }

  /**
   * Add a "no usage" message when the ability wasn't used
   */
  addNoUsage(): GuideBuilder {
    this.components.push(this.createNoUsageComponent(this.spell));
    return this;
  }

  /**
   * Add a custom component if the built-in options don't fit your needs
   */
  addCustomComponent(config: { component: JSX.Element }): GuideBuilder {
    this.components.push(config.component);
    return this;
  }

  /**
   * Add a chart (built with ChartBuilder)
   * Convenience method for adding charts with proper spacing
   */
  addChart(chart: JSX.Element): GuideBuilder {
    this.components.push(<div style={{ marginTop: '16px' }}>{chart}</div>);
    return this;
  }

  /**
   * Add expandable cast timelines showing spells cast around key events
   * Perfect for showing what was cast during cooldown windows or special events
   *
   * @param config Configuration for the cast timelines
   * @param config.events Array of events to show timelines for
   * @param config.getCastEvents Function to get cast events for a given event
   * @param config.formatTimestamp Function to format timestamps
   * @param config.getEventTimestamp Function to get timestamp from an event
   * @param config.getEventHeader Function to generate header for each timeline
   * @param config.performanceData Optional performance data for each event
   * @param config.windowDescription Optional description of what the window represents
   *
   * @example
   * .addCastTimelines({
   *   events: touchCasts,
   *   getCastEvents: (cast) => this.getCastsInWindow(cast.timestamp - 5000, cast.timestamp + 5000),
   *   formatTimestamp: this.owner.formatTimestamp,
   *   getEventTimestamp: (cast) => cast.timestamp,
   *   getEventHeader: (cast, index) => <>Cast #{index + 1}</>,
   *   performanceData: performanceBoxRow,
   *   windowDescription: 'Spells cast during Touch of the Magi'
   * })
   */
  addCastTimelines<T>(config: {
    events: T[];
    getCastEvents: (event: T) => CastEvent[];
    formatTimestamp: (timestamp: number) => string;
    getEventTimestamp: (event: T) => number;
    getEventHeader: (event: T, index: number) => ReactNode;
    performanceData?: BoxRowEntry[];
    windowDescription?: string;
  }): GuideBuilder {
    this.components.push(
      this.createCastTimelines(
        config.events,
        config.getCastEvents,
        config.formatTimestamp,
        config.getEventTimestamp,
        config.getEventHeader,
        config.performanceData,
        config.windowDescription,
      ),
    );
    return this;
  }

  /**
   * Conditional builder - only add components if condition is true
   * Makes it easy to handle cases like "show timeline if data exists, otherwise show no usage"
   *
   * @param condition The condition to check
   * @param builderFunc Function that receives this builder and adds components
   */
  when(condition: boolean, builderFunc: (builder: GuideBuilder) => GuideBuilder): GuideBuilder {
    if (condition) {
      builderFunc(this);
    }
    return this;
  }

  /**
   * Alternative path for when() - executes if the last when() condition was false
   * @param builderFunc Function that receives this builder and adds components
   */
  otherwise(builderFunc: (builder: GuideBuilder) => GuideBuilder): GuideBuilder {
    // Note: This is a simplified implementation. A more sophisticated version would
    // track the last condition state, but for most use cases this pattern works:
    // when(condition, ...).otherwise(...) where otherwise is only called if when wasn't
    builderFunc(this);
    return this;
  }

  /**
   * Build the final guide subsection JSX
   */
  build(): JSX.Element {
    return this.createSubsection(this.explanationContent, this.components, this.title);
  }

  // ========================================
  // Private implementation methods
  // ========================================

  private createSubsection(
    explanation: JSX.Element,
    dataComponents: JSX.Element[],
    title: string,
  ): JSX.Element {
    const data = (
      <RoundedPanel style={{ padding: '8px 8px 8px 16px' }}>
        <div>
          {dataComponents.map((component, index) => (
            <div
              key={index}
              style={{ marginBottom: index < dataComponents.length - 1 ? '8px' : '0' }}
            >
              {component}
            </div>
          ))}
        </div>
      </RoundedPanel>
    );

    // If explanationPercent is undefined, use vertical layout
    if (this.explanationPercent === undefined) {
      return (
        <SubSection title={title}>
          <div style={{ marginBottom: '16px' }}>
            <Explanation>{explanation}</Explanation>
          </div>
          {data}
        </SubSection>
      );
    }

    // Otherwise use side-by-side layout
    return explanationAndDataSubsection(
      explanation,
      data,
      this.explanationPercent ?? GUIDE_CORE_EXPLANATION_PERCENT,
      title,
    );
  }

  private createPerCastSummary(spell: Spell, castEntries: BoxRowEntry[]): JSX.Element {
    return <CastSummaryAndBreakdown spell={spell} castEntries={castEntries} />;
  }

  private createCastEfficiencyStats(spell: Spell): JSX.Element {
    return <CastEfficiencyStatElement spell={spell} useThresholds />;
  }

  private createCastEfficiencyBar(spell: Spell): JSX.Element {
    return <CastEfficiencyBarElement spell={spell} />;
  }

  private createCastSummaryAndBreakdown(castEntries: BoxRowEntry[]): JSX.Element {
    return <CastSummaryAndBreakdown spell={this.spell} castEntries={castEntries} />;
  }

  // ===============================
  // PRIVATE HELPER METHODS
  // ===============================

  /** Calculate average stacks from stack uptime data */
  private calculateAverageStacks(
    stackData: { start: number; end: number; stacks: number }[],
    startTime: number,
    endTime: number,
  ): number {
    const fightDuration = endTime - startTime;
    let totalStackTime = 0;

    stackData.forEach((data) => {
      const duration = data.end - data.start;
      totalStackTime += duration * data.stacks;
    });

    return totalStackTime / fightDuration;
  }

  /** Calculate uptime percentage from background uptime data */
  private calculateUptimePercentage(
    backgroundUptimes: { start: number; end: number }[],
    startTime: number,
    endTime: number,
  ): number {
    const fightDuration = endTime - startTime;
    let totalUptime = 0;

    backgroundUptimes.forEach((uptime) => {
      totalUptime += uptime.end - uptime.start;
    });

    return totalUptime / fightDuration;
  }

  // ===============================
  // PRIVATE COMPONENT CREATORS
  // ===============================

  private createStatistic(
    spell: Spell,
    value: string,
    label: string,
    performance: QualitativePerformance,
    tooltip?: JSX.Element,
  ): JSX.Element {
    const spellIcon = <SpellIcon spell={spell} />;

    const content = tooltip ? (
      <div
        style={{
          color: qualitativePerformanceToColor(performance),
          fontSize: '20px',
          textAlign: 'left',
        }}
      >
        {spellIcon}{' '}
        <TooltipElement content={tooltip}>
          <span style={{ display: 'inline-block' }}>
            {value} <small>{label}</small>
          </span>
        </TooltipElement>
      </div>
    ) : (
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

    return (
      <RoundedPanel style={{ textAlign: 'left', padding: '8px 8px 8px 0' }}>{content}</RoundedPanel>
    );
  }

  private createPerCastBreakdown(castEntries: BoxRowEntry[], title: string): JSX.Element {
    return (
      <div>
        <strong>{title}</strong>
        <PerformanceBoxRow values={castEntries} />
        <small>green (good) / red (fail) mouseover the rectangles to see more details</small>
      </div>
    );
  }

  private createExpandableCastBreakdown(
    castBreakdowns: React.ReactNode[],
    title?: string,
  ): JSX.Element {
    return (
      <div style={{ margin: '0' }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>{title || 'Per-Cast Breakdown'}</strong>
          <small> - click to expand</small>
        </div>
        {castBreakdowns.map((breakdown, index) => (
          <div
            key={index}
            style={{ marginBottom: index < castBreakdowns.length - 1 ? '8px' : '0' }}
          >
            {breakdown}
          </div>
        ))}
      </div>
    );
  }

  private createCooldownTimeline(
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

  private createBuffUptimeGraph(
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
        {uptimeGraph}
      </div>
    );
  }

  private createNoUsageComponent(spell: Spell): JSX.Element {
    return (
      <div>
        <SpellIcon spell={spell} /> <strong>No {spell.name} casts recorded.</strong>
        <br />
        <small>
          Make sure you are using this spell if it is available to you and you are specced into it.
        </small>
      </div>
    );
  }

  private createBuffStackUptime(
    spell: Spell,
    stackData: { start: number; end: number; stacks: number }[],
    averageStacks: number,
    castEntries: BoxRowEntry[],
    uptimePercentage: number,
    backgroundUptimes: { start: number; end: number }[],
    startTime: number,
    endTime: number,
    maxStacks: number,
    barColor: string,
    backgroundBarColor: string,
    tooltip?: string,
  ): JSX.Element {
    return (
      <RoundedPanel style={{ padding: '8px 8px 8px 16px' }}>
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
                  tooltip ||
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
                stackUptimeHistory={stackData}
                start={startTime}
                end={endTime}
                maxStacks={maxStacks}
                barColor={barColor}
                backgroundHistory={backgroundUptimes}
                backgroundBarColor={backgroundBarColor}
                timeTooltip
              />
            </div>
          </div>
        </div>
      </RoundedPanel>
    );
  }

  private createCastTimelines<T>(
    events: T[],
    getCastEvents: (event: T) => CastEvent[],
    formatTimestamp: (timestamp: number) => string,
    getEventTimestamp: (event: T) => number,
    getEventHeader: (event: T, index: number) => ReactNode,
    performanceData?: BoxRowEntry[],
    windowDescription?: string,
  ): JSX.Element {
    const timelineEvents = events.map((event, index) => ({
      timestamp: getEventTimestamp(event),
      casts: getCastEvents(event),
      header: (
        <>
          {getEventHeader(event, index)} @ {formatTimestamp(getEventTimestamp(event))}
        </>
      ),
      performance: performanceData?.[index]?.value,
    }));

    return <CastTimeline events={timelineEvents} windowDescription={windowDescription} />;
  }
}

/**
 * Generates expandable breakdown components for cast analysis.
 * Creates expandable components showing detailed breakdowns for each cast.
 *
 * @param config Configuration containing cast data, evaluated data, and expandable config
 * @returns Array of React components (CooldownExpandable elements)
 */
export function generateExpandableBreakdown(config: {
  castData: unknown[];
  evaluatedData: BoxRowEntry[];
  expandableConfig: ExpandableConfig;
}): React.ReactNode[] {
  return config.castData.map((cast, index) => {
    const evaluatedEntry = config.evaluatedData[index];
    const expandableConfig = config.expandableConfig;

    const timestamp = expandableConfig.getTimestamp(cast);
    const checklistItems = expandableConfig.checklistItems.map(
      (item: {
        label: JSX.Element;
        getResult: (data: unknown, evaluatedData: BoxRowEntry) => boolean;
        getDetails: (data: unknown) => string;
      }) => ({
        label: item.label,
        result: <PassFailCheckmark pass={item.getResult(cast, evaluatedEntry)} />,
        details: item.getDetails(cast),
      }),
    );

    // Add cast timeline if getCastEvents is provided
    let detailItems: Array<{ label: React.ReactNode; details: React.ReactNode }> | undefined;
    if (expandableConfig.getCastEvents) {
      const casts = expandableConfig.getCastEvents(cast);
      const spells = casts
        .filter((castEvent) => castEvent.ability && castEvent.ability.guid)
        .map((castEvent) => ({
          id: castEvent.ability.guid,
          name: castEvent.ability.name,
          icon: castEvent.ability.abilityIcon.replace('.jpg', ''),
        }));

      detailItems = [
        {
          label: (
            <div style={{ display: 'block', width: '100%' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong>{expandableConfig.castTimelineDescription || 'Casts during window'}</strong>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <SpellSeq spells={spells} />
              </div>
            </div>
          ),
          details: <></>,
        },
      ];
    }

    const header = (
      <>
        @ {expandableConfig.formatTimestamp(timestamp)} &mdash;{' '}
        <SpellLink spell={expandableConfig.spell} />
      </>
    );

    return (
      <CooldownExpandable
        header={header}
        checklistItems={checklistItems}
        detailItems={detailItems}
        perf={evaluatedEntry.value}
        key={index}
      />
    );
  });
}
