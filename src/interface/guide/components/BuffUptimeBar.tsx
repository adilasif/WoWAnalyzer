import { ReactNode } from 'react';
import styled from '@emotion/styled';
import Spell from 'common/SPELLS/Spell';
import { Tooltip } from 'interface';
import { formatPercentage } from 'common/format';
import UptimeStackBar from 'parser/ui/UptimeStackBar';
import { TrackedBuffEvent } from 'parser/core/Entity';

interface BuffUptimeBarProps {
  spell: Spell;
  buffHistory: TrackedBuffEvent[];
  startTime: number;
  endTime: number;
  barColor?: string;
  backgroundBarColor?: string;
  maxStacks?: number;
  averageStacksTooltip?: ReactNode;
}

/**
 * Displays buff uptime percentage with stack visualization.
 * Shows header, stats cards, and a timeline bar visualization.
 */
export default function BuffUptimeBar({
  spell,
  buffHistory,
  startTime,
  endTime,
  barColor = '#cd1bdf',
  backgroundBarColor = '#7e5da8',
  maxStacks,
  averageStacksTooltip,
}: BuffUptimeBarProps): JSX.Element {
  // Calculate uptime percent - sum all buff windows
  const fightDuration = endTime - startTime;
  const uptimeMs = buffHistory.reduce((sum, entry) => {
    const buffEnd = entry.end === null ? endTime : entry.end;
    return sum + (buffEnd - entry.start);
  }, 0);
  const uptimePercent = fightDuration > 0 ? uptimeMs / fightDuration : 0;

  // Calculate average stacks if stacks are present using stackHistory
  const hasStacks = buffHistory.some(
    (entry) => entry.stackHistory && entry.stackHistory.length > 0,
  );
  let averageStacks: number | undefined = undefined;
  let stackUptimeHistory: { start: number; end: number; stacks: number }[] | undefined = undefined;
  if (hasStacks && maxStacks !== undefined) {
    let totalWeightedStacks = 0;
    stackUptimeHistory = [];

    // Process stackHistory to get time-weighted stacks
    buffHistory.forEach((buff) => {
      const buffEnd = buff.end === null ? endTime : buff.end;
      if (buff.stackHistory && buff.stackHistory.length > 0) {
        buff.stackHistory.forEach((stack, idx, arr) => {
          const stackStart = stack.timestamp;
          const stackEnd = idx === arr.length - 1 ? buffEnd : arr[idx + 1].timestamp;
          const duration = stackEnd - stackStart;
          totalWeightedStacks += stack.stacks * duration;
          stackUptimeHistory!.push({
            start: stackStart,
            end: stackEnd,
            stacks: stack.stacks,
          });
        });
      }
    });

    averageStacks = fightDuration > 0 ? totalWeightedStacks / fightDuration : 0;
  }

  // For background bar, just use periods when buff was active
  const backgroundHistory = buffHistory.map((buff) => ({
    start: buff.start,
    end: buff.end === null ? endTime : buff.end,
  }));

  const defaultTooltip = `This is the average number of stacks you had over the course of the fight, counting periods where you didn't have the buff as zero stacks.`;

  return (
    <Container>
      <TopSection>
        <LeftColumn>
          <HeaderTitle>{spell.name} Buff Uptime</HeaderTitle>
          <TimelineLabel>Timeline</TimelineLabel>
        </LeftColumn>
        <StatsColumn>
          <StatCard color={backgroundBarColor}>
            <StatValue>{formatPercentage(uptimePercent, 0)}%</StatValue>
            <StatLabel>Uptime</StatLabel>
          </StatCard>
          {hasStacks && averageStacks !== undefined && (
            <Tooltip content={averageStacksTooltip || defaultTooltip}>
              <StatCard color={barColor}>
                <StatValue>{averageStacks.toFixed(1)}</StatValue>
                <StatLabel>Avg Stacks</StatLabel>
              </StatCard>
            </Tooltip>
          )}
          {hasStacks && maxStacks !== undefined && (
            <StatCard color="#888">
              <StatValue>{maxStacks}</StatValue>
              <StatLabel>Max Stacks</StatLabel>
            </StatCard>
          )}
        </StatsColumn>
      </TopSection>

      <TimelineContainer>
        <div style={{ height: '100%', position: 'relative' }}>
          {hasStacks && stackUptimeHistory && maxStacks !== undefined ? (
            <UptimeStackBar
              stackUptimeHistory={stackUptimeHistory}
              start={startTime}
              end={endTime}
              maxStacks={maxStacks}
              barColor={barColor}
              backgroundHistory={backgroundHistory}
              backgroundBarColor={backgroundBarColor}
              timeTooltip
            />
          ) : (
            <SimpleUptimeBar style={{ background: backgroundBarColor }} />
          )}
        </div>
      </TimelineContainer>
    </Container>
  );
}

const Container = styled.div`
  margin-bottom: 16px;
`;

const TopSection = styled.div`
  display: flex;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 8px;
`;

const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: space-between;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fab700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const TimelineLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const StatsColumn = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const StatCard = styled.div<{ color: string }>`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
  min-width: 70px;
  border-left: 3px solid ${(props) => props.color};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  margin-bottom: 2px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
`;

const StatLabel = styled.div`
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TimelineContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 4px;
  height: 32px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const SimpleUptimeBar = styled.div`
  height: 24px;
  border-radius: 4px;
  width: 100%;
`;
