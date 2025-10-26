import styled from '@emotion/styled';
import { i18n } from '@lingui/core';
import { defineMessage } from '@lingui/core/macro';
import { findZoneByBossId, type Boss } from 'game/raids';
import {
  AboutIcon,
  ArmorIcon,
  ChecklistIcon,
  EventsIcon,
  InsanityIcon,
  StatisticsIcon,
  TimelineIcon,
  MoreIcon as OtherIcon,
} from 'interface/icons';
import { isMessageDescriptor } from 'localization/isMessageDescriptor';
import type Config from 'parser/Config';
import { ParseResultsTab } from 'parser/core/Analyzer';
import type CharacterProfile from 'parser/core/CharacterProfile';
import type Fight from 'parser/core/Fight';
import { type PlayerInfo } from 'parser/core/Player';
import { ComponentType, useMemo } from 'react';
import { Link } from 'react-router-dom';
import HeaderBackground from './HeaderBackground';
import { currentExpansion } from 'game/GameBranch';
import { formatDuration } from 'common/format';
import * as difficulty from 'game/DIFFICULTIES';

const colors = {
  bodyText: '#f3eded',
  unfocusedText: '#ccc',
  wowaYellow: '#fab700',
};

const level0 = {
  background: '#101010',
  border: '#161616',
  shadow: '0 1px 3px black',
};

const level1 = {
  background: '#161616',
  border: '#202020',
  shadow: '0 1px 4px black',
};

const level2 = {
  background: '#202020',
  border: '#303030',
  shadow: '0 1px 6px #101010',
};

const Section = styled.section`
  border: 1px solid ${level1.border};
  padding: 1rem;
  background: ${level1.background};
  box-shadow: ${level1.shadow};
`;

const HeaderContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;

  grid-template-areas:
    'boss character'
    'tabs stats';

  gap: 1rem 0;

  align-items: end;
`;

interface HeaderProps {
  config: Config;
  player: PlayerInfo;
  characterProfile: CharacterProfile | null;
  boss: Boss | null;
  fight: Fight;
  tabs: ParseResultsTab[];
  selectedTab: string;
  makeTabUrl: (url: string) => string;
}

interface InternalTab extends ParseResultsTab {
  icon: ComponentType;
  hidden?: boolean;
}

const standardTabs = {
  before: [
    {
      icon: ChecklistIcon,
      title: defineMessage({
        id: 'interface.report.results.navigationBar.overview',
        message: 'Overview',
      }),
      url: 'overview',
    },
    {
      icon: StatisticsIcon,
      title: defineMessage({
        id: 'interface.report.results.navigationBar.statistics',
        message: 'Statistics',
      }),
      url: 'statistics',
    },
    {
      icon: TimelineIcon,
      title: defineMessage({
        id: 'interface.report.results.navigationBar.timeline',
        message: 'Timeline',
      }),
      url: 'timeline',
    },
  ],
  after: [
    {
      icon: ArmorIcon,
      title: defineMessage({
        id: 'interface.report.results.navigationBar.character',
        message: 'Character',
      }),
      url: 'character',
    },
    {
      icon: AboutIcon,
      title: defineMessage({
        id: 'interface.report.results.navigationBar.about',
        message: 'About',
      }),
      url: 'about',
    },
    {
      icon: EventsIcon,
      title: defineMessage({
        id: 'interface.report.results.navigationBar.events',
        message: 'Events',
      }),
      url: 'events',
      hidden: true,
    },
    {
      icon: InsanityIcon,
      title: defineMessage({
        id: 'interface.report.results.navigationBar.debug',
        message: 'Debug',
      }),
      url: 'debug',
      hidden: true,
    },
  ],
} satisfies Record<string, Omit<InternalTab, 'render'>[]>;

export default function Header({
  player,
  characterProfile,
  config,
  tabs,
  selectedTab,
  makeTabUrl,
  boss,
  fight,
}: HeaderProps): JSX.Element | null {
  const tabList = useMemo(
    () =>
      [
        ...standardTabs.before,
        ...tabs.map((tab) => ({ ...tab, icon: OtherIcon })),
        ...standardTabs.after,
      ] as InternalTab[],
    [tabs],
  );

  const expansion = currentExpansion(config.branch);
  const raid = boss ? findZoneByBossId(boss.id) : undefined;

  return (
    <>
      <HeaderBackground boss={boss} raid={raid} expansion={expansion} />
      <div className="container">
        <Section style={{ paddingBottom: 0 }}>
          <HeaderContainer>
            <BossMiniBox boss={boss} fight={fight} />
            <CharacterMiniBox player={player} characterProfile={characterProfile} config={config} />
            <TabStrip>
              {tabList
                .filter((tab: InternalTab) => !tab.hidden || tab.url === selectedTab)
                .map(({ icon: Icon, ...tab }) => (
                  <TabButton
                    key={tab.url}
                    to={makeTabUrl(tab.url)}
                    className={selectedTab === tab.url ? 'active' : ''}
                  >
                    <Icon />
                    {isMessageDescriptor(tab.title) ? i18n._(tab.title) : tab.title}
                  </TabButton>
                ))}
            </TabStrip>
            <StatBox />
          </HeaderContainer>
        </Section>
      </div>
    </>
  );
}

const TabStrip = styled.nav`
  grid-area: tabs;
`;
const TabButton = styled(Link)`
  appearance: none;
  border: none;
  background: none;

  display: inline-flex;
  gap: 0.5rem;
  flex-direction: row;
  align-items: center;

  & > svg {
    margin-top: 0;
    height: 1.25em;
    shape-rendering: geometricPrecision;
  }

  color: ${colors.bodyText};

  padding: 0.5rem 0.75rem;

  border-bottom: 3px solid ${level2.border};

  &:hover {
    background: ${level2.background};
    text-decoration: none;
    color: inherit;
    border-bottom: 3px solid color-mix(in srgb, ${colors.wowaYellow} 90%, transparent);
  }

  &.active {
    border-bottom: 3px solid ${colors.wowaYellow};
  }

  &:focus {
    color: inherit;
    text-decoration: none;
  }
`;

const MiniBoxContainer = styled.div`
  display: grid;
  gap: 0.5rem 1rem;

  max-height: 5rem;
  height: 5rem;

  grid-template-columns: min-content 1fr;
  grid-template-rows: 2rem auto;

  grid-template-areas:
    'image name'
    'image subtext';

  &.flipped {
    grid-template-columns: max-content min-content;

    grid-template-areas:
      'name image'
      'subtext image';

    justify-items: end;
    text-align: right;
  }
`;

const MiniBoxName = styled.div`
  font-size: 2rem;
  font-weight: bold;
`;

const MiniBoxSubtext = styled.span`
  font-size: 1.4rem;
  color: ${colors.unfocusedText};
`;

const MiniBoxImage = styled.img`
  grid-area: image;
  width: 5rem;
  height: 5rem;
  border: 1px solid ${level2.border};
  border-radius: 0.5rem;
`;

function CharacterMiniBox({
  player,
  characterProfile,
  config,
}: Pick<HeaderProps, 'characterProfile' | 'player' | 'config'>): JSX.Element | null {
  return (
    <MiniBoxContainer className={'flipped'}>
      <MiniBoxImage
        src={characterProfile?.thumbnail ?? `/specs/${player.icon}.jpg`.replaceAll(/ /g, '')}
        alt={player.icon}
      />
      <MiniBoxName className={player.type}>{player.name}</MiniBoxName>
      <MiniBoxSubtext>
        {config.spec.specName ? i18n._(config.spec.specName) : null} {i18n._(config.spec.className)}
      </MiniBoxSubtext>
    </MiniBoxContainer>
  );
}

function BossMiniBox({ boss, fight }: Pick<HeaderProps, 'boss' | 'fight'>): JSX.Element | null {
  if (!boss) {
    return null;
  }

  // TODO: This should be happening at the boss config level.

  let icon = boss.icon ?? '';

  if (!icon.startsWith('https:')) {
    icon = `https://assets.rpglogs.com/img/warcraft/bosses/${boss.id % 50_000}-icon.jpg`;
  }

  const duration = formatDuration((fight.original_end_time ?? fight.end_time) - fight.start_time);
  return (
    <MiniBoxContainer>
      <MiniBoxImage src={icon} alt={boss.name} />
      <MiniBoxName>{boss.name}</MiniBoxName>
      <MiniBoxSubtext>
        {difficulty.getLabel(fight.difficulty ?? 0)}{' '}
        {fight.kill ? `Kill - ${duration}` : `Wipe - ${duration}`}
      </MiniBoxSubtext>
    </MiniBoxContainer>
  );
}

const StatBoxContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: end;

  text-align: center;
  font-size: 1.5rem;

  & > * {
    border-right: 1px solid ${level2.border};
  }

  & > *:first-child {
    padding-left: 0;
  }

  & > *:last-child {
    border-right: none;
    padding-right: 0;
  }
`;

const StatBoxStat = styled.dl`
  & > dt {
    font-weight: normal;
    color: ${colors.unfocusedText};
    font-size: 75%;
  }

  margin-bottom: 0.5rem;
  padding: 0 1rem;
`;

function StatBox(): JSX.Element | null {
  return (
    <StatBoxContainer>
      <StatBoxStat>
        <dt>Boss DPS</dt>
        <dd>1.01m DPS</dd>
      </StatBoxStat>
      <StatBoxStat>
        <dt>Add DPS</dt>
        <dd>0.24m DPS</dd>
      </StatBoxStat>
    </StatBoxContainer>
  );
}
