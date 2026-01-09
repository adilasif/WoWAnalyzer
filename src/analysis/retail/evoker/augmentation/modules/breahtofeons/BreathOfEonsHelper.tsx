import { FC, JSX } from 'react';
import { useMemo } from 'react';
import { BreathOfEonsWindows } from './BreathOfEonsRotational';
import { SubSection } from 'interface/guide';
import { SpellLink, TooltipElement } from 'interface';
import { formatDuration, formatNumber } from 'common/format';
import TALENTS from 'common/TALENTS/evoker';
import PassFailBar from 'interface/guide/components/PassFailBar';
import '../Styling.scss';
import LazyLoadGuideSection from 'analysis/retail/evoker/shared/modules/components/LazyLoadGuideSection';
import { fetchEvents } from 'common/fetchWclApi';
import CombatLogParser from '../../CombatLogParser';
import ExplanationGraph, {
  DataSeries,
  GraphData,
  generateGraphData,
} from 'analysis/retail/evoker/shared/modules/components/ExplanationGraph';
import DonutChart from 'parser/ui/DonutChart';
import { PlayerInfo } from 'parser/core/Player';
import { DamageEvent } from 'parser/core/Events';
import {
  ABILITY_BLACKLIST,
  ABILITY_NO_BOE_SCALING,
  ABILITY_NO_SCALING,
  ABILITY_NO_EM_SCALING,
} from '../util/abilityFilter';
import { encodeEventTargetString } from 'parser/shared/modules/Enemies';

interface BreathOfEonsHelperProps {
  windows: BreathOfEonsWindows[];
  fightStartTime: number;
  fightEndTime: number;
  owner: CombatLogParser;
}

const debug = false;

const ABILITY_FILTER = new Set<number>([
  ...ABILITY_NO_BOE_SCALING,
  ...ABILITY_BLACKLIST,
  ...ABILITY_NO_SCALING,
  ...ABILITY_NO_EM_SCALING,
]);

interface DamageWindow {
  start: number;
  end: number;
  sum: number;
  startFormat: string;
  endFormat: string;
  sumSources: DamageSources[];
}

/** Range to search for other windows */
const WINDOW_BUFFER_RANGE_MS = 20000;

interface DamageSources {
  sourceID: number;
  damage: number;
  lostDamage: number;
}

interface WindowResponse {
  events: DamageEvent[];
  start: number;
  end: number;
}

type DamageTable = {
  events: DamageEvent[];
  start: number;
  end: number;
};

const BreathOfEonsHelper: FC<BreathOfEonsHelperProps> = ({
  windows,
  fightStartTime,
  fightEndTime,
  owner,
}) => {
  const damageTables: DamageTable[] = [];

  /** Generate filter so we only get class abilities
   * that can accumulate into BoE
   * TODO: this can and should be optimized */
  const filter = useMemo(() => {
    const filter = `type = "damage" 
    AND not (source.role = "tank" or source.role = "healer")
    AND (target.id != source.id)
    AND not (target.id = source.owner.id)
    AND not (supportedActor.id = target.id)
    AND not (source.id = target.owner.id)
    AND source.disposition = "friendly"
    AND target.disposition != "friendly"
    AND (source.id > 0)`;

    if (debug) {
      console.log(filter);
    }
    return filter;
  }, []);

  async function loadData() {
    const fetchPromises: Promise<WindowResponse>[] = [];

    for (const window of windows) {
      const start = Math.max(window.start - WINDOW_BUFFER_RANGE_MS, fightStartTime);
      const end = Math.min(window.end + WINDOW_BUFFER_RANGE_MS, fightEndTime);

      fetchPromises.push(getEvents(start, end, filter, owner.report.code));
    }

    const result = await Promise.all(fetchPromises);

    result.forEach((window) => {
      damageTables.push({
        events: window.events,
        start: window.start,
        end: window.end,
      });
    });
  }

  /** We want to attribute pet damage to it's owner
   * This information isn't found in V1 damage events, therefore
   * we need to find the pets and assign them to their respective owner
   * Luckily, all pets, along with their owner info, is found in the report! */
  const pets: number[] = [];
  const petToPlayerMap = new Map<number, number>();
  for (const pet of owner.report.friendlyPets) {
    petToPlayerMap.set(pet.id, pet.petOwner);
    pets.push(pet.id);
  }
  /** Due to MC mechanics we can have friendly pets do damage
   * but not show up as a friendlyPet, but rather enemyPet
   * since we are filtering for specific players might as well
   * just attribute these as well. */
  for (const pet of owner.report.enemyPets) {
    petToPlayerMap.set(pet.id, pet.petOwner);
    pets.push(pet.id);
  }
  /** Assign playerId with PlayerInfo */
  const playerNameMap = new Map<number, PlayerInfo>();
  for (const player of owner.report.friendlies) {
    playerNameMap.set(player.id, player);
  }

  function getSectionContent() {
    const graphData: GraphData[] = [];
    const explanations: JSX.Element[] = [];

    for (let index = 0; index < damageTables.length; index += 1) {
      if (!windows[index]) {
        continue;
      }

      const {
        damageInRange,
        lostDamage,
        earlyDeadMobsDamage,
        breathStart,
        breathEnd,
        damageToDisplay,
        topWindow,
        sourceInRange,
      } = processWindowData(
        index,
        damageTables[index],
        windows[index],
        fightStartTime,
        pets,
        petToPlayerMap,
      );

      const newGraphData = generateGraphDataForWindow(
        topWindow,
        breathStart,
        breathEnd,
        damageInRange,
      );
      graphData.push(newGraphData);

      const content = generateExplanationContent(
        topWindow,
        sourceInRange,
        damageToDisplay,
        damageInRange,
        lostDamage,
        earlyDeadMobsDamage,
        playerNameMap,
      );
      explanations.push(content);
    }

    return (
      <div>
        <ExplanationGraph
          fightStartTime={fightStartTime}
          fightEndTime={fightEndTime}
          graphData={graphData}
          yAxisName="Damage Ratio"
          explanations={explanations}
        />
      </div>
    );
  }

  return (
    <SubSection title="Breath of Eons helper">
      <p>
        This module offers a detailed damage breakdown of your{' '}
        <SpellLink spell={TALENTS.BREATH_OF_EONS_TALENT} /> usage, helping you determine if there
        was a more optimal timing to cast it.
      </p>

      <LazyLoadGuideSection loader={loadData.bind(this)} value={getSectionContent.bind(this)} />
    </SubSection>
  );
};

export default BreathOfEonsHelper;

async function getEvents(
  start: number,
  end: number,
  filter: string,
  code: string,
): Promise<WindowResponse> {
  const response = (await fetchEvents(
    code,
    start,
    end,
    undefined,
    filter,
    // High maxPage allowances needed otherwise it breaks
    40,
  )) as DamageEvent[];
  const events = response.filter(
    (event) => !ABILITY_FILTER.has(event.ability.guid) && !event.subtractsFromSupportedActor,
  );

  return {
    events,
    start,
    end,
  };
}

function processWindowData(
  windowIndex: number,
  damageTable: DamageTable,
  windowData: BreathOfEonsWindows,
  fightStartTime: number,
  pets: number[],
  petToPlayerMap: Map<number, number>,
) {
  const ebonMightDropTimestamp =
    windowData.breathPerformance.ebonMightProblems.find((problem) => problem.count === 0)
      ?.timestamp ?? 0;
  const ebonMightReappliedTimestamp =
    ebonMightDropTimestamp + windowData.breathPerformance.ebonMightDroppedDuration;

  const damageWindows: DamageWindow[] = [];
  const recentDamage: DamageEvent[] = [];
  const sourceInRange: DamageSources[] = [];
  let damageInRange = 0;
  let lostDamage = 0;
  let earlyDeadMobsDamage = 0;

  const breathStart = windowData.start;
  const breathEnd = windowData.end;
  const breathLength = breathEnd - breathStart;

  const mobsToIgnore = windowData.breathPerformance.earlyDeadMobs.reduce(
    (acc, mob) => acc.add(encodeEventTargetString(mob)),
    new Set<string>(),
  );

  for (const event of damageTable.events) {
    recentDamage.push(event);

    /** This first part is only gathering damage from our current window
     * and from the current buffed targets - ie. baseline */
    if (event.timestamp >= breathStart && event.timestamp <= breathEnd) {
      const sourceID =
        (pets.includes(event.sourceID ?? -1)
          ? petToPlayerMap.get(event.sourceID ?? -1)
          : event.sourceID) ?? -1;

      const damageAmount = event.amount + (event.absorbed ?? 0);

      const index = sourceInRange.findIndex((sum) => sum.sourceID === sourceID);
      if (index !== -1) {
        sourceInRange[index].damage += damageAmount;
      } else {
        sourceInRange.push({ sourceID: sourceID, damage: damageAmount, lostDamage: 0 });
      }

      if (
        event.timestamp >= ebonMightDropTimestamp &&
        event.timestamp <= ebonMightReappliedTimestamp
      ) {
        lostDamage += damageAmount;
      }
      damageInRange += damageAmount;

      if (mobsToIgnore.has(encodeEventTargetString(event))) {
        earlyDeadMobsDamage += damageAmount;
      }
    }

    /** This second part is gathering damage from all possible windows
     * this collects from all actors. */
    while (
      recentDamage[recentDamage.length - 1].timestamp - recentDamage[0].timestamp >=
      breathLength
    ) {
      const eventsWithinWindow = recentDamage.filter(
        (event) =>
          event.timestamp >= recentDamage[0].timestamp &&
          event.timestamp <= recentDamage[0].timestamp + breathLength,
      );

      const sourceSums: DamageSources[] = [];

      for (const eventWithinWindow of eventsWithinWindow) {
        const sourceID =
          (pets.includes(eventWithinWindow.sourceID ?? -1)
            ? petToPlayerMap.get(eventWithinWindow.sourceID ?? -1)
            : eventWithinWindow.sourceID) ?? -1;

        const damageAmount = eventWithinWindow.amount + (eventWithinWindow.absorbed ?? 0);

        const index = sourceSums.findIndex((sum) => sum.sourceID === sourceID);
        if (index !== -1) {
          sourceSums[index].damage += damageAmount;
        } else {
          sourceSums.push({ sourceID: sourceID, damage: damageAmount, lostDamage: 0 });
        }
      }

      damageWindows.push({
        start: recentDamage[0].timestamp,
        end: recentDamage[0].timestamp + breathLength,
        sum: sourceSums.reduce((a, b) => a + b.damage, 0),
        sumSources: sourceSums.sort((a, b) => b.damage - a.damage),
        startFormat: formatDuration(recentDamage[0].timestamp - fightStartTime),
        endFormat: formatDuration(recentDamage[0].timestamp + breathLength - fightStartTime),
      });

      recentDamage.shift();
    }
  }

  const sortedWindows = damageWindows.sort((a, b) => b.sum - a.sum);
  const topWindow = sortedWindows[0];
  const damageToDisplay = damageInRange - earlyDeadMobsDamage;

  if (debug) {
    console.log(windowIndex + 1 + '. ', 'Top Window:', topWindow);
    console.log(
      windowIndex + 1 + '.',
      'Damage within current window:',
      damageToDisplay,
      'Expected sum:',
      windowData.breathPerformance.damage,
      ' difference:',
      damageToDisplay / windowData.breathPerformance.damage,
      'start:',
      formatDuration(breathStart - fightStartTime),
      breathStart,
      'end:',
      formatDuration(breathEnd - fightStartTime),
      breathEnd,
    );
    console.log(
      windowIndex + 1 + '.',
      'source:',
      sourceInRange.sort((a, b) => b.damage - a.damage),
    );
    console.log(
      windowIndex + 1 + '.',
      'sorted source:',
      sourceInRange.sort((a, b) => b.damage - a.damage),
    );
    console.log(windowIndex + 1 + '.', 'damage lost to ebon drop:', lostDamage);
    console.log(windowIndex + 1 + '.', 'damage lost to early mob deaths:', earlyDeadMobsDamage);
  }

  return {
    damageInRange,
    lostDamage,
    earlyDeadMobsDamage,
    breathStart,
    breathEnd,
    damageToDisplay,
    topWindow,
    sourceInRange: sourceInRange.sort((a, b) => b.damage - a.damage),
  };
}

function generateGraphDataForWindow(
  topWindow: DamageWindow,
  breathStart: number,
  breathEnd: number,
  damageInRange: number,
) {
  const dataSeries: DataSeries[] = !topWindow
    ? []
    : [
        {
          spellTracker: [
            {
              timestamp: breathStart,
              count: 1,
            },
            {
              timestamp: breathEnd,
              count: 0,
            },
          ],
          type: 'area',
          color: '#736F4E',
          label: 'Current timing',
          strokeWidth: 5,
        },
        {
          spellTracker: [
            {
              timestamp: topWindow.start,
              count: 1 * (topWindow.sum / damageInRange),
            },
            {
              timestamp: topWindow.end,
              count: 0,
            },
          ],
          type: 'area',
          color: '#4C78A8',
          label: 'Optimal timing',
          strokeWidth: 5,
        },
      ];

  const newGraphData = generateGraphData(
    dataSeries,
    breathStart - WINDOW_BUFFER_RANGE_MS,
    breathEnd + WINDOW_BUFFER_RANGE_MS,
    'Breath Window',
    !topWindow ? <>You didn't hit anything.</> : undefined,
  );

  return newGraphData;
}

function generateExplanationContent(
  topWindow: DamageWindow,
  inRangeSum: DamageSources[],
  damageToDisplay: number,
  damageInRange: number,
  lostDamage: number,
  earlyDeadMobsDamage: number,
  playerNameMap: Map<number, PlayerInfo>,
) {
  if (!topWindow) {
    return <div></div>;
  }

  const damageSourcesOptimal = [];
  const colorMap = ['#2D3142', '#4F5D75', '#BFC0C0', '#EF8354', '#FFFFFF'];

  for (let i = 0; i < topWindow.sumSources.length; i += 1) {
    const source = topWindow.sumSources[i];
    const playerInfo = playerNameMap.get(source.sourceID);
    damageSourcesOptimal.push({
      color: colorMap[i],
      label: playerInfo?.name,
      valueTooltip: formatNumber(source.damage),
      value: source.damage,
    });
  }

  const damageSourcesCurrent = [];

  for (let i = 0; i < inRangeSum.length; i += 1) {
    const source = inRangeSum[i];
    const playerInfo = playerNameMap.get(source.sourceID);
    damageSourcesCurrent.push({
      color: colorMap[i],
      label: playerInfo?.name,
      valueTooltip: formatNumber(source.damage),
      value: source.damage,
    });
  }

  const content: JSX.Element = (
    <div className="flex-container">
      <div className="explanation-table">
        <div className="flex-row">
          <div className="flex-cell">
            <TooltipElement
              content="Because of the way Blizzard handles damage attribution, the values 
                    displayed here may have a small margin of error. Additionally, if an enemy 
                    becomes immune or takes reduced damage when your Breath of Eons explodes, this 
                    value may also be overestimated."
            >
              Damage:
            </TooltipElement>
          </div>
          <div className="flex-cell">
            {formatNumber(damageToDisplay)} / {formatNumber(topWindow.sum)}
          </div>
          <div className="flex-cell">
            <PassFailBar pass={damageToDisplay} total={topWindow.sum} />
          </div>
        </div>
        <div className="flex-row">
          <div className="flex-cell">
            <TooltipElement
              content="This value represents the potential damage increase achievable 
                    by using Breath of Eons at its optimal timing. It assumes that you didn't 
                    lose any damage due to prematurely dropping Ebon Might or mobs dying early."
            >
              Potential damage increase:
            </TooltipElement>
          </div>
          <div className="flex-cell">
            {Math.round(((topWindow.sum - damageInRange) / damageInRange) * 100)}%
          </div>
        </div>
      </div>
      {lostDamage + earlyDeadMobsDamage > 0 && (
        <div className="explanation-table">
          <div className="flex-row">
            <strong className="badCast">You lost damage to the following:</strong>
          </div>
          {lostDamage > 0 && (
            <div className="flex-row">
              <div className="flex-cell">
                <span>Dropped Ebon Might uptime:</span>
              </div>
              <div className="flex-cell">{formatNumber(lostDamage)}</div>
            </div>
          )}
          {earlyDeadMobsDamage > 0 && (
            <div className="flex-row">
              <div className="flex-cell">
                <span>Mobs dying early:</span>
              </div>
              <div className="flex-cell">{formatNumber(earlyDeadMobsDamage)}</div>
            </div>
          )}
        </div>
      )}
      <div className="explanation-table">
        <div className="flex-row">
          <TooltipElement
            content="The values below assume that you didn't lose any damage 
                  due to prematurely dropping Ebon Might or mobs dying early."
          >
            <strong>Player contribution breakdown</strong>
          </TooltipElement>
        </div>
        <div className="flex-row">
          <div className="flex-cell">
            <span className=" currentBreath">Current Window</span>
            <DonutChart items={damageSourcesCurrent} />
          </div>
          <div className="flex-cell"></div>
          <div className="flex-cell">
            <span className=" optimalBreath">Optimal Window</span>
            <DonutChart items={damageSourcesOptimal} />
          </div>
        </div>
      </div>
    </div>
  );

  return content;
}
