import React from 'react';
import Spell from 'common/SPELLS/Spell';
import { VisualizationSpec } from 'react-vega';
import AutoSizer from 'react-virtualized-auto-sizer';
import BaseChart, { formatTime } from 'parser/ui/BaseChart';

export interface AnnotationEvent {
  timestamp: number;
  spell?: Spell;
  label?: string;
  color?: string;
  type?: 'cast' | 'buff' | 'debuff' | 'damage' | 'heal' | 'death' | 'custom';
}

export interface DataSeries {
  name: string;
  data: Array<{ timestamp: number; value: number }>;
  color?: string;
  backgroundColor?: string;
  type?: 'line' | 'area' | 'bar';
  opacity?: number;
  strokeWidth?: number;
}
interface ManaUpdate {
  timestamp: number;
  current: number;
  max: number;
  used?: number;
}

interface AnnotationConfig {
  events: Array<{ timestamp: number; spell?: Spell; label?: string; color?: string }>;
  type?: 'cast' | 'buff' | 'damage' | 'death' | 'custom';
  color?: string;
}

interface ManaChartProps {
  manaUpdates: ManaUpdate[];
  startTime: number;
  endTime: number;
  annotations?: AnnotationConfig[];
  lowManaThreshold?: number;
  showBossHealth?: boolean;
  reportCode?: string;
}

/**
 * Displays a mana tracking chart for Mage specs.
 * Shows mana percentage over time with optional annotations and warnings.
 */
const defaultAnnotations: AnnotationConfig[] = [];
export default function ManaChart({
  manaUpdates,
  startTime,
  endTime,
  annotations = defaultAnnotations,
  lowManaThreshold,
  showBossHealth = false,
  reportCode,
}: ManaChartProps): JSX.Element {
  const [bossHealthData, setBossHealthData] = React.useState<Array<{
    timestamp: number;
    value: number;
  }> | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Fetch boss health if requested
  React.useEffect(() => {
    let cancelled = false;
    if (!showBossHealth || !reportCode) {
      return;
    }

    const fetchBossHealth = async () => {
      try {
        const fetchWcl = (await import('common/fetchWclApi')).default;
        const json = await fetchWcl(`report/graph/resources/${reportCode}`, {
          start: startTime,
          end: endTime,
          sourceclass: 'Boss',
          hostility: 'Enemies',
          abilityid: 1000,
        });

        const bossData = json as { series?: Array<{ data: Array<[number, number]> }> };

        if (bossData?.series?.[0]?.data && !cancelled) {
          setBossHealthData(
            bossData.series[0].data.map((dataPoint: [number, number]) => ({
              timestamp: dataPoint[0],
              value: dataPoint[1],
            })),
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load boss health data:', error);
          setBossHealthData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBossHealth();
    return () => {
      cancelled = true;
    };
  }, [showBossHealth, reportCode, startTime, endTime]);

  // Build mana series
  const series: DataSeries[] = [];

  let manaData: Array<{ timestamp: number; value: number }>;
  if (manaUpdates && manaUpdates.length > 0) {
    const initial = manaUpdates[0].current / manaUpdates[0].max;
    manaData = [{ timestamp: startTime, value: 100 * initial }];

    const processedUpdates = manaUpdates.map((update) => ({
      timestamp: Math.max(update.timestamp, startTime),
      value: (update.current / update.max) * 100,
    }));

    manaData.push(...processedUpdates);
  } else {
    manaData = [
      { timestamp: startTime, value: 100 },
      { timestamp: endTime, value: 100 },
    ];
  }

  series.push({
    name: manaUpdates && manaUpdates.length > 0 ? 'Mana' : 'Mana (No Data)',
    data: manaData,
    color: '#2196F3',
    type: 'area',
    opacity: 0.7,
    backgroundColor: '#2196F340',
  });

  // Add boss health if loaded
  if (bossHealthData && bossHealthData.length > 0) {
    series.push({
      name: 'Boss Health',
      data: bossHealthData,
      color: '#FF4444',
      type: 'line',
      opacity: 0.8,
      backgroundColor: '#FF444440',
    });
  }

  // Build annotations
  const allAnnotations: AnnotationEvent[] = [];
  const defaultColors = {
    cast: '#4CAF50',
    buff: '#2196F3',
    damage: '#F44336',
    death: '#D32F2F',
    custom: '#9E9E9E',
  };

  annotations.forEach((config) => {
    const annotationType = config.type || 'cast';
    config.events.forEach((event) => {
      allAnnotations.push({
        timestamp: event.timestamp,
        spell: event.spell,
        label: event.label || (annotationType === 'death' ? 'Death' : undefined),
        type: annotationType,
        color: event.color || config.color || defaultColors[annotationType],
      });
    });
  });

  // Add low mana warnings if threshold specified
  if (lowManaThreshold !== undefined && manaUpdates && manaUpdates.length > 0) {
    const warnings = manaUpdates
      .filter(
        (update) =>
          update.current / update.max < lowManaThreshold && update.timestamp > startTime + 30000,
      )
      .map((update) => ({
        timestamp: update.timestamp,
        label: 'Low Mana',
        type: 'custom' as const,
        color: '#EF4444',
      }));
    allAnnotations.push(...warnings);
  }

  if (loading) {
    return <div>Loading chart data...</div>;
  }

  // Chart rendering logic (adapted from GeneralizedChart)
  const processedSeries = series.map((s) => ({
    ...s,
    data: s.data.map((point) => {
      const relativeTime = point.timestamp - startTime;
      const minutes = Math.floor(relativeTime / 60000);
      const seconds = Math.floor((relativeTime % 60000) / 1000);
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      return {
        x: relativeTime,
        y: point.value,
        timeFormatted: formattedTime,
      };
    }),
  }));

  const processedAnnotations = allAnnotations.map((ann, index) => {
    const relativeTime = ann.timestamp - startTime;
    const minutes = Math.floor(relativeTime / 60000);
    const seconds = Math.floor((relativeTime % 60000) / 1000);
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const overlapThreshold = 1000;
    let adjustedTime = relativeTime;
    const overlappingAnnotations = allAnnotations
      .slice(0, index)
      .filter(
        (prevAnn) => Math.abs(prevAnn.timestamp - startTime - relativeTime) < overlapThreshold,
      );
    if (overlappingAnnotations.length > 0) {
      adjustedTime = relativeTime + overlappingAnnotations.length * 200;
    }
    return {
      x: adjustedTime,
      originalX: relativeTime,
      label: ann.label || (ann.spell ? ann.spell.name : 'Event'),
      color: ann.color,
      spell: ann.spell,
      type: ann.type || 'custom',
      timeFormatted: formattedTime,
    };
  });

  const baseEncoding = {
    x: {
      field: 'x',
      type: 'quantitative' as const,
      axis: {
        labelExpr: formatTime('datum.value'),
        grid: false,
        title: 'Time',
      },
      scale: { zero: true, nice: false },
    },
    y: {
      field: 'y',
      type: 'quantitative' as const,
      axis: {
        labelExpr: 'datum.value + "%"',
        title: 'Percentage',
        tickCount: 5,
        grid: true,
      },
      scale: {
        zero: true,
        domain: [0, 100],
      },
    },
  };

  const seriesLayers = processedSeries.map((s, index) => ({
    data: { name: `series_${index}` },
    mark: {
      type: s.type || 'line',
      opacity: s.opacity || (s.type === 'area' ? 0.7 : 1),
      strokeWidth: s.strokeWidth || 2,
      ...(s.type === 'area' && {
        line: {
          color: s.color || '#2196F3',
          strokeWidth: s.strokeWidth || 1,
        },
        color: s.backgroundColor || (s.color ? s.color + '40' : '#2196F340'),
      }),
      ...(s.type !== 'area' && {
        color: s.color || '#2196F3',
      }),
    },
    encoding: {
      ...baseEncoding,
      tooltip: [
        { field: 'timeFormatted', type: 'nominal' as const, title: 'Time' },
        { datum: s.name, type: 'nominal' as const, title: 'Series' },
        { field: 'y', type: 'quantitative' as const, title: 'Value', format: '.1f' },
      ],
    },
  }));

  const annotationLayers =
    processedAnnotations.length > 0
      ? [
          {
            data: { name: 'annotations' },
            mark: {
              type: 'rule' as const,
              strokeWidth: 2,
              opacity: 0.8,
            },
            encoding: {
              x: baseEncoding.x,
              color: {
                field: 'color',
                type: 'nominal' as const,
                scale: null,
              },
              tooltip: [
                { field: 'label', type: 'nominal' as const, title: 'Event' },
                { field: 'type', type: 'nominal' as const, title: 'Type' },
                { field: 'timeFormatted', type: 'nominal' as const, title: 'Time' },
              ],
            },
          },
        ]
      : [];

  const spec: VisualizationSpec = {
    title: undefined,
    layer: [...seriesLayers, ...annotationLayers],
  };

  const chartData: Record<string, unknown> = {
    annotations: processedAnnotations,
  };
  processedSeries.forEach((s, index) => {
    chartData[`series_${index}`] = s.data;
  });

  return (
    <AutoSizer disableHeight>
      {({ width }) => <BaseChart height={400} width={width} spec={spec} data={chartData} />}
    </AutoSizer>
  );
}
