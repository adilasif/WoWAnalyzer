import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/shaman';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  AnyEvent,
  ApplyBuffEvent,
  BeginCastEvent,
  BeginChannelEvent,
  CastEvent,
  DamageEvent,
  EndChannelEvent,
  EventType,
  GlobalCooldownEvent,
  RemoveBuffEvent,
} from 'parser/core/Events';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import Statistic from 'parser/ui/Statistic';
import { STATISTIC_ORDER } from 'parser/ui/StatisticBox';
import { ON_CAST_BUFF_REMOVAL_GRACE_MS } from '../../constants';
import CooldownUsage from 'parser/core/MajorCooldowns/CooldownUsage';
import MajorCooldown, { CooldownTrigger } from 'parser/core/MajorCooldowns/MajorCooldown';
import { QualitativePerformance, getLowestPerf } from 'parser/ui/QualitativePerformance';
import Enemies from 'parser/shared/modules/Enemies';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import { FLAMESHOCK_BASE_DURATION } from 'analysis/retail/shaman/shared/core/FlameShock';
import { PANDEMIC_WINDOW } from 'parser/shared/modules/earlydotrefreshes/EarlyDotRefreshes';
import { Talent } from 'common/TALENTS/types';
import EmbeddedTimelineContainer, {
  SpellTimeline,
} from 'interface/report/Results/Timeline/EmbeddedTimeline';
import Casts from 'interface/report/Results/Timeline/Casts';
import { ChecklistUsageInfo, SpellUse } from 'parser/core/SpellUsage/core';
import { ResourceLink, SpellIcon, SpellLink } from 'interface';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import { formatDuration } from 'common/format';
import SpellMaelstromCost from '../core/SpellMaelstromCost';
import MaelstromTracker from '../resources/MaelstromTracker';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';

const SK_DAMAGE_AFFECTED_ABILITIES = [
  SPELLS.LIGHTNING_BOLT_OVERLOAD,
  SPELLS.LIGHTNING_BOLT,
  SPELLS.CHAIN_LIGHTNING_OVERLOAD,
  TALENTS.CHAIN_LIGHTNING_TALENT,
];

interface SKTimeline {
  /** The start time (in ms) of the window */
  start: number;
  /** The end time (in ms) of the window */
  end: number;
  /** The events that happened inside the window */
  events: AnyEvent[];
  /** The performance of the window */
  performance: QualitativePerformance;
}

interface StormkeeperCast extends CooldownTrigger<BeginCastEvent | ApplyBuffEvent> {
  /** How much maelstrom the user had when starting the window rotation */
  maelstromOnCast: number;
  /** How long Flameshock had left when starting the window rotation */
  flameshockDurationOnCast: number;
  /** What the user cast between casting SK and consuming the second buff. */
  timeline: SKTimeline;
  /** The ability that started the window. */
  firstStormkeeperEnhancedCast?: CastEvent;
  /**  */
  prepull: boolean;
}

interface MaelstromGenerator {
  base: number;
  overload: number;
}

const FLAMESHOCK_IDEAL_DURATION_REMAINING = 10000;

class Stormkeeper extends MajorCooldown<StormkeeperCast> {
  static dependencies = {
    ...MajorCooldown.dependencies,
    maelstromTracker: MaelstromTracker,
    enemies: Enemies,
    spellUsable: SpellUsable,
    spellMaelstromCost: SpellMaelstromCost,
  };

  maelstromTracker!: MaelstromTracker;
  enemies!: Enemies;
  spellUsable!: SpellUsable;

  nextCastStartsWindow = false;
  stormkeeperCast: BeginCastEvent | null = null;

  activeWindow: StormkeeperCast | null = null;
  stSpender: Talent;
  stSpenderCost: number;
  damageDoneByBuffedCasts = 0;
  maelstromGeneration = {
    lightningBolt: {
      base: 6,
      overload: 2,
    },
    lavaBurst: {
      base: 8,
      overload: 3,
    },
    iceFury: {
      base: 12,
      overload: 4,
    },
  } satisfies Record<string, MaelstromGenerator>;

  constructor(options: Options) {
    super({ spell: TALENTS.STORMKEEPER_TALENT }, options);

    this.stSpender = this.selectedCombatant.hasTalent(TALENTS.ELEMENTAL_BLAST_TALENT)
      ? TALENTS.ELEMENTAL_BLAST_TALENT
      : TALENTS.EARTH_SHOCK_TALENT;

    this.active =
      this.selectedCombatant.hasTalent(TALENTS.STORMKEEPER_TALENT) ||
      this.selectedCombatant.hasTalent(TALENTS.ROLLING_THUNDER_TALENT);
    this.stSpenderCost = this.stSpender.maelstromCost ?? 0;
    if (this.selectedCombatant.hasTalent(TALENTS.EYE_OF_THE_STORM_TALENT)) {
      this.stSpenderCost -= this.stSpender.id === TALENTS.ELEMENTAL_BLAST_TALENT.id ? 10 : 5;
    }
    if (!this.active) {
      return;
    }

    [Events.begincast, Events.applybuff].forEach((filter) =>
      this.addEventListener(
        filter.by(SELECTED_PLAYER).spell(SPELLS.STORMKEEPER_BUFF_AND_CAST),
        this.onStormkeeperWindowStart,
      ),
    );

    [
      Events.begincast,
      Events.BeginChannel,
      Events.EndChannel,
      Events.cast,
      Events.GlobalCooldown,
    ].forEach((filter) =>
      this.addEventListener(filter.by(SELECTED_PLAYER), this.addEventToTimeline),
    );
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.STORMKEEPER_BUFF_AND_CAST),
      () => (this.nextCastStartsWindow = true),
    );
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.STORMKEEPER_BUFF_AND_CAST),
      this.onStormkeeperRemoved,
    );
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(SK_DAMAGE_AFFECTED_ABILITIES),
      this.onDamage,
    );
  }

  startWindowMaelstromRequired(): number {
    // Rough heuristic: enough maelstrom to fit both spenders during the window,
    // accounting for the maelstrom gained from the first Lightning Bolt cast.
    return Math.max(
      0,
      this.stSpenderCost * 2 -
        (this.maelstromGeneration.lightningBolt.base +
          this.maelstromGeneration.lightningBolt.overload),
    );
  }

  onStormkeeperWindowStart(event: BeginCastEvent | ApplyBuffEvent) {
    // cast was successful and not already in a stormkeeper window
    if ((event.type === EventType.ApplyBuff || event.castEvent) && !this.activeWindow) {
      this.activeWindow = {
        event: event,
        maelstromOnCast: this.maelstromTracker.current,
        flameshockDurationOnCast:
          this.enemies
            .getEntity(event)
            ?.getRemainingBuffTimeAtTimestamp(
              SPELLS.FLAME_SHOCK.id,
              FLAMESHOCK_BASE_DURATION,
              FLAMESHOCK_BASE_DURATION * (1 + PANDEMIC_WINDOW),
              event.timestamp,
            ) || 0,
        timeline: {
          start: event.timestamp,
          end: -1,
          events: [],
          performance: QualitativePerformance.Perfect,
        },
        prepull: event.timestamp <= this.owner.fight.start_time + 1000, // prepull in this context is within the first second of combat
      };
    }
  }

  onStormkeeperRemoved(event: RemoveBuffEvent) {
    if (!this.activeWindow) {
      return;
    }

    const lastGcd = this.activeWindow.timeline.events
      .filter((e) => e.type === EventType.GlobalCooldown)
      .at(-1);
    this.activeWindow.timeline.end = Math.max(
      event.timestamp,
      lastGcd?.type === EventType.GlobalCooldown
        ? lastGcd.timestamp + Math.round(lastGcd.duration)
        : 0,
    );
    this.recordCooldown(this.activeWindow);
    this.nextCastStartsWindow = false;
    this.activeWindow = null;
  }

  addEventToTimeline(
    event: BeginCastEvent | BeginChannelEvent | EndChannelEvent | CastEvent | GlobalCooldownEvent,
  ) {
    if (this.activeWindow) {
      if (event.type === EventType.Cast) {
        if (
          !this.activeWindow.firstStormkeeperEnhancedCast &&
          [SPELLS.LIGHTNING_BOLT.id, TALENTS.CHAIN_LIGHTNING_TALENT.id].includes(event.ability.guid)
        ) {
          this.activeWindow.maelstromOnCast = this.maelstromTracker.current;
          this.activeWindow.firstStormkeeperEnhancedCast ??= event;
        }
      }

      this.activeWindow.timeline.events.push(event);
    }
  }

  onDamage(event: DamageEvent) {
    if (
      !this.selectedCombatant.hasBuff(
        SPELLS.STORMKEEPER_BUFF_AND_CAST.id,
        event.timestamp,
        ON_CAST_BUFF_REMOVAL_GRACE_MS,
      )
    ) {
      return;
    }

    this.damageDoneByBuffedCasts += event.amount + (event.absorbed || 0);
  }

  private explainTimelineWithDetails(cast: StormkeeperCast) {
    const checklistItem = {
      performance: cast.timeline.performance,
      summary: <span>Spell order</span>,
      details: <span>Spell order: See below</span>,
      check: 'stormkeeper-timeline',
      timestamp: cast.event.timestamp,
    };

    // check the window consumed the 2 Stormkeeper charges with LB/CL casts
    const stormkeeperConsumers = cast.timeline.events.filter(
      (e) =>
        e.type === EventType.Cast &&
        [SPELLS.LIGHTNING_BOLT.id, TALENTS.CHAIN_LIGHTNING_TALENT.id].includes(e.ability.guid),
    ) as CastEvent[];
    checklistItem.performance =
      stormkeeperConsumers.length === 2
        ? QualitativePerformance.Perfect
        : QualitativePerformance.Fail;

    const extraDetails = (
      <div
        style={{
          overflowX: 'scroll',
        }}
      >
        <EmbeddedTimelineContainer
          secondWidth={60}
          secondsShown={(cast.timeline.end - cast.timeline.start) / 1000}
        >
          <SpellTimeline>
            <Casts
              start={cast.event.timestamp}
              movement={undefined}
              secondWidth={60}
              events={cast.timeline.events}
            />
          </SpellTimeline>
        </EmbeddedTimelineContainer>
      </div>
    );

    return { extraDetails, checklistItem };
  }

  /**
   * Determine the performance of how much maelstrom the user had when casting SK
   */
  private determineMaelstromPerformance(
    maelstromRequired: number,
    cast: StormkeeperCast,
  ): QualitativePerformance {
    if (cast.maelstromOnCast >= maelstromRequired) {
      return QualitativePerformance.Perfect;
    } else {
      return QualitativePerformance.Ok;
    }
  }

  private explainMaelstromPerformance(cast: StormkeeperCast) {
    const maelstromRequired = this.startWindowMaelstromRequired();
    const maelstromOnCastPerformance = this.determineMaelstromPerformance(maelstromRequired, cast);

    const checklistItem = {
      performance: maelstromOnCastPerformance,
      summary: (
        <span>
          {cast.maelstromOnCast} <ResourceLink id={RESOURCE_TYPES.MAELSTROM.id} />
        </span>
      ),
      details: (
        <span>
          Had at least {maelstromRequired} <ResourceLink id={RESOURCE_TYPES.MAELSTROM.id} /> on
          window start (you had {cast.maelstromOnCast})
        </span>
      ),
      check: 'stormkeeper-maelstrom',
      timestamp: cast.event.timestamp,
    };

    return checklistItem;
  }

  private determineFlameshockPerformance(flameshockDurationOnCast: number): QualitativePerformance {
    if (flameshockDurationOnCast > FLAMESHOCK_IDEAL_DURATION_REMAINING) {
      return QualitativePerformance.Perfect;
    } else {
      return QualitativePerformance.Ok;
    }
  }

  private explainFlSPerformance(cast: StormkeeperCast) {
    const FlSPerformance = this.determineFlameshockPerformance(cast.flameshockDurationOnCast);

    const checklistItem = {
      performance: FlSPerformance,
      summary: (
        <span>
          <SpellLink spell={SPELLS.FLAME_SHOCK} />: {formatDuration(cast.flameshockDurationOnCast)}
          s{' '}
        </span>
      ),
      details: (
        <span>
          {' '}
          <SpellLink spell={SPELLS.FLAME_SHOCK} /> had at least{' '}
          {formatDuration(FLAMESHOCK_IDEAL_DURATION_REMAINING)} seconds remaining on window start
          (you had {formatDuration(cast.flameshockDurationOnCast)}s)
        </span>
      ),
      check: 'stormkeeper-flameshock',
      timestamp: cast.event.timestamp,
    };

    return checklistItem;
  }

  private determineTotalWindowPerformance(
    timelinePerformance: QualitativePerformance,
    maelstromOnCastPerformance: QualitativePerformance,
    FlSPerformance: QualitativePerformance,
  ) {
    // if timeline performance is perfect, we can make maelstrom performance perfect as well
    if (timelinePerformance === QualitativePerformance.Perfect) {
      maelstromOnCastPerformance = QualitativePerformance.Perfect;
    }

    return getLowestPerf([
      timelinePerformance,
      maelstromOnCastPerformance,
      /* Failing this should not nuke the entire performance, so make the lower
      limit Good */
      FlSPerformance === QualitativePerformance.Perfect
        ? QualitativePerformance.Perfect
        : QualitativePerformance.Good,
      /* Failing this should not nuke the entire performance, so make the lower
      limit Good */
    ]);
  }

  explainPerformance(cast: StormkeeperCast): SpellUse {
    const timeline = this.explainTimelineWithDetails(cast);
    const maelstromOnCast = this.explainMaelstromPerformance(cast);
    const FlSDuration = this.explainFlSPerformance(cast);

    const totalPerformance = this.determineTotalWindowPerformance(
      timeline.checklistItem.performance,
      maelstromOnCast.performance,
      FlSDuration.performance,
    );

    return {
      event: cast.event,
      performance: totalPerformance,
      checklistItems: [maelstromOnCast, FlSDuration, timeline.checklistItem].filter(
        (x) => x,
      ) as ChecklistUsageInfo[],
      extraDetails: timeline.extraDetails,
    };
  }

  statistic() {
    return (
      <Statistic
        category={STATISTIC_CATEGORY.TALENTS}
        position={STATISTIC_ORDER.OPTIONAL()}
        size="flexible"
      >
        <BoringSpellValueText spell={TALENTS.STORMKEEPER_TALENT}>
          <>
            <ItemDamageDone amount={this.damageDoneByBuffedCasts} />
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }

  description() {
    return (
      <>
        <p>
          <strong>
            <SpellLink spell={TALENTS.STORMKEEPER_TALENT} />
          </strong>{' '}
          massively amplifies the strength of your next two
          <SpellLink spell={SPELLS.LIGHTNING_BOLT} /> or
          <SpellLink spell={TALENTS.CHAIN_LIGHTNING_TALENT} /> casts. Therefore, you want to combine
          this effect with as many of the other damage amplifying effects you have at your disposal.
        </p>
        <p>
          In short, the ideal cast order is the following: <br />
          <small>For more information, see the written guides.</small>
        </p>
        <p>
          <SpellIcon spell={TALENTS.STORMKEEPER_TALENT} /> &rarr;
          <SpellIcon spell={this.stSpender} /> &rarr;
          <SpellIcon spell={SPELLS.LIGHTNING_BOLT} /> &rarr;
          <SpellIcon spell={this.stSpender} /> &rarr;
          <SpellIcon spell={SPELLS.LIGHTNING_BOLT} />
        </p>
      </>
    );
  }

  guideSubsection() {
    return this.active ? <CooldownUsage analyzer={this} title="Stormkeeper" /> : null;
  }
}

export default Stormkeeper;
