import { t } from '@lingui/macro';
import CombatLogParser from 'analysis/retail/hunter/survival/CombatLogParser';
import {
  RESOURCES_HUNTER_AVERAGE_THRESHOLD,
  RESOURCES_HUNTER_MAJOR_THRESHOLD,
  RESOURCES_HUNTER_MINOR_THRESHOLD,
} from 'analysis/retail/hunter/shared/constants';
import TALENTS from 'common/TALENTS/hunter';
import { formatNumber, formatPercentage } from 'common/format';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import { ResourceLink } from 'interface';
import { ModulesOf, PerformanceMark, Section, SubSection } from 'interface/guide';
import PerformanceStrongWithTooltip from 'interface/PerformanceStrongWithTooltip';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { SpellLink } from 'interface';

export default function ResourceUseSection(modules: ModulesOf<typeof CombatLogParser>) {
  return (
    <Section
      title={t({
        id: 'guide.hunter.survival.sections.resources.title',
        message: 'Resource Use',
      })}
    >
      <SubSection
        title={t({
          id: 'guide.hunter.survival.sections.resources.focus.title',
          message: 'Focus',
        })}
      >
        <p>
          Your primary resource is <ResourceLink id={RESOURCE_TYPES.FOCUS.id} />. Typically, ability
          use will be limited by <ResourceLink id={RESOURCE_TYPES.FOCUS.id} />, not time. Avoid
          capping <ResourceLink id={RESOURCE_TYPES.FOCUS.id} /> - lost{' '}
          <ResourceLink id={RESOURCE_TYPES.FOCUS.id} /> regeneration is lost DPS. It will
          occasionally be impossible to avoid capping <ResourceLink id={RESOURCE_TYPES.FOCUS.id} />{' '}
          - like while handling mechanics or during intermission phases or during Coordinated
          Assault with Relentless Primal Ferocity talented or when spawning a Beast in Pack Leader.
        </p>
        The chart below shows your <ResourceLink id={RESOURCE_TYPES.FOCUS.id} /> over the course of
        the encounter. You wasted{' '}
        <PerformanceStrongWithTooltip
          performance={modules.focusTracker.percentAtCapPerformance}
          tooltip={
            <>
              <PerformanceMark perf={QualitativePerformance.Perfect} /> Perfect usage &lt;={' '}
              {formatPercentage(RESOURCES_HUNTER_MINOR_THRESHOLD, 0)}%
              <br />
              <PerformanceMark perf={QualitativePerformance.Good} /> Good usage &lt;={' '}
              {formatPercentage(RESOURCES_HUNTER_AVERAGE_THRESHOLD, 0)}%
              <br />
              <PerformanceMark perf={QualitativePerformance.Ok} /> OK usage &lt;={' '}
              {formatPercentage(RESOURCES_HUNTER_MAJOR_THRESHOLD, 0)}%{' '}
            </>
          }
        >
          {formatNumber(modules.focusTracker.wasted)} (
          {formatPercentage(modules.focusTracker.percentAtCap, 1)}%)
        </PerformanceStrongWithTooltip>{' '}
        <ResourceLink id={RESOURCE_TYPES.FOCUS.id} />.{modules.focusGraph.plot}
      </SubSection>
      <SubSection title="Tip of the Spear">
        <p>
          Your <SpellLink spell={TALENTS.KILL_COMMAND_SURVIVAL_TALENT} /> <strong>builds</strong>{' '}
          <SpellLink spell={TALENTS.TIP_OF_THE_SPEAR_TALENT} />
          Stacks. These stacks are consumed one per cast of your <strong>Direct Damage</strong>{' '}
          dealing abilities.
        </p>
        <p>
          <strong>
            {' '}
            Tip of the Spear does not buff the periodic damage of abilities like{' '}
            <SpellLink spell={TALENTS.WILDFIRE_BOMB_TALENT} />, or{' '}
            <SpellLink spell={TALENTS.FLAMEFANG_PITCH_TALENT} />.
          </strong>
        </p>
      </SubSection>
    </Section>
  );
}
