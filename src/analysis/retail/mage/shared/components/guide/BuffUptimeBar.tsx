import { ReactNode } from 'react';
import Spell from 'common/SPELLS/Spell';
import { SpellIcon, TooltipElement } from 'interface';
import { formatPercentage } from 'common/format';
import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import UptimeStackBar from 'parser/ui/UptimeStackBar';

interface BuffUptimeBarProps {
  spell: Spell;
  buffHistory: Array<{ start: number; end: number | null; stacks?: number }>;
  startTime: number;
  endTime: number;
  barColor?: string;
  backgroundBarColor?: string;
  maxStacks?: number;
  averageStacksTooltip?: ReactNode;
}

/**
 * Displays buff uptime percentage with an optional stack visualization bar.
 * @param spell - The buff spell to display
 * @param buffHistory - Array of buff windows with start/end times and optional stack counts
 * @param startTime - Fight start timestamp in ms
 * @param endTime - Fight end timestamp in ms
 * @param barColor - Color for the stack visualization (default: '#cd1bdf')
 * @param backgroundBarColor - Color for the uptime background (default: '#7e5da8')
 * @param maxStacks - Maximum possible stacks for the buff
 * @param averageStacksTooltip - Custom tooltip content for average stacks display
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
  // Normalize buffHistory: replace null end with endTime
  const normalizedHistory = buffHistory.map((entry) => ({
    start: entry.start,
    end: entry.end === null ? endTime : entry.end,
    stacks: entry.stacks,
  }));

  // Calculate uptime percent
  const fightDuration = endTime - startTime;
  const uptimeMs = normalizedHistory.reduce((sum, entry) => sum + (entry.end - entry.start), 0);
  const uptimePercent = fightDuration > 0 ? uptimeMs / fightDuration : 0;

  // Calculate average stacks if stacks are present
  const hasStacks = normalizedHistory.some((entry) => typeof entry.stacks === 'number');
  let averageStacks: number | undefined = undefined;
  let stackUptimeHistory: { start: number; end: number; stacks: number }[] | undefined = undefined;
  if (hasStacks) {
    let totalWeightedStacks = 0;
    stackUptimeHistory = normalizedHistory
      .filter((entry) => typeof entry.stacks === 'number')
      .map((entry) => {
        totalWeightedStacks += (entry.stacks as number) * (entry.end - entry.start);
        return { start: entry.start, end: entry.end, stacks: entry.stacks as number };
      });
    averageStacks = fightDuration > 0 ? totalWeightedStacks / fightDuration : 0;
  }
  // For background bar, just use periods when buff was active
  const backgroundHistory = normalizedHistory.map(({ start, end }) => ({ start, end }));
  const defaultTooltip = `This is the average number of stacks you had over the course of the fight, counting periods where you didn't have the buff as zero stacks.`;

  return (
    <RoundedPanel style={{ padding: '8px 8px 8px 16px' }}>
      <strong>{spell.name} Uptime</strong>
      <div className="flex-main multi-uptime-bar">
        <div className="flex main-bar-big">
          <div className="flex-sub bar-label">
            <SpellIcon spell={spell} />{' '}
            <span style={{ color: backgroundBarColor }}>
              {formatPercentage(uptimePercent, 0)}% <small>active</small>
            </span>
            {hasStacks && averageStacks !== undefined && (
              <>
                <br />
                <TooltipElement content={averageStacksTooltip || defaultTooltip}>
                  <span style={{ color: barColor }}>
                    {averageStacks.toFixed(1)} <small>avg stacks</small>
                  </span>
                </TooltipElement>
              </>
            )}
          </div>
          <div className="flex-main chart">
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
              // fallback: just show background bar
              <div
                style={{
                  height: 24,
                  background: backgroundBarColor,
                  borderRadius: 4,
                  width: '100%',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </RoundedPanel>
  );
}
