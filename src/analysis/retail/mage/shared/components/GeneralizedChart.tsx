import React from 'react';
import { VisualizationSpec } from 'react-vega';
import AutoSizer from 'react-virtualized-auto-sizer';
import { SpellIcon } from 'interface';
import BaseChart, { formatTime } from 'parser/ui/BaseChart';
import Spell from 'common/SPELLS/Spell';

// Data point interfaces
export interface TimeValue {
  timestamp: number;
  value: number;
}

export interface AnnotationEvent {
  timestamp: number;
  spell?: Spell;
  label?: string;
  color?: string;
  type?: 'cast' | 'buff' | 'debuff' | 'damage' | 'heal' | 'death' | 'custom';
}

export interface DataSeries {
  name: string;
  data: TimeValue[];
  color?: string;
  backgroundColor?: string;
  type?: 'line' | 'area' | 'bar';
  opacity?: number;
  strokeWidth?: number;
}

// Chart configuration
export interface ChartConfig {
  title?: string;
  height?: number;
  width?: number;
  yAxisLabel?: string;
  yAxisFormat?: 'percentage' | 'number' | 'time' | 'custom';
  yAxisMax?: number;
  yAxisMin?: number;
  showGrid?: boolean;
  showXGrid?: boolean;
  showYGrid?: boolean;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
}

interface Props {
  series: DataSeries[];
  annotations?: AnnotationEvent[];
  config?: ChartConfig;
  startTime: number;
  endTime: number;
}

class GeneralizedChart extends React.PureComponent<Props> {
  private getYAxisFormat(format?: string) {
    switch (format) {
      case 'percentage':
        return 'datum.value + "%"';
      case 'time':
        return formatTime('datum.value');
      case 'number':
      default:
        return 'datum.value';
    }
  }

  private getAnnotationColor(type?: string): string {
    switch (type) {
      case 'cast':
        return '#4CAF50';
      case 'buff':
        return '#2196F3';
      case 'debuff':
        return '#FF9800';
      case 'damage':
        return '#F44336';
      case 'heal':
        return '#8BC34A';
      case 'death':
        return '#D32F2F';
      case 'custom':
      default:
        return '#9E9E9E';
    }
  }

  private renderCustomLegend(series: DataSeries[], annotations: AnnotationEvent[]) {
    if (series.length === 0 && (!annotations || !annotations.some((a) => a.spell))) {
      return null;
    }

    return (
      <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {/* Series legend items - use exact colors from series data */}
        {series.map((s, i) => (
          <div
            key={`series-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#e9e8e7',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '3px',
                backgroundColor:
                  s.name === 'Mana'
                    ? '#2196F3'
                    : s.name === 'Boss Health'
                      ? '#FF4444'
                      : s.color || '#2196F3',
              }}
            />
            <span>{s.name}</span>
          </div>
        ))}

        {/* Spell annotation legend items - use exact colors from annotation data */}
        {annotations &&
          annotations
            .filter((a) => a.spell)
            .reduce((unique, ann) => {
              if (!unique.find((u) => u.spell?.id === ann.spell?.id)) {
                unique.push(ann);
              }
              return unique;
            }, [] as AnnotationEvent[])
            .map((ann, i) => (
              <div
                key={`spell-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#e9e8e7',
                }}
              >
                {ann.spell && (
                  <SpellIcon spell={ann.spell} style={{ width: '16px', height: '16px' }} />
                )}
                <span>{ann.spell?.name || ann.label}</span>
                <div
                  style={{
                    width: '12px',
                    height: '2px',
                    backgroundColor:
                      ann.spell?.name === 'Arcane Surge'
                        ? '#db35acff'
                        : ann.spell?.name === 'Evocation'
                          ? '#10B981'
                          : ann.color || this.getAnnotationColor(ann.type),
                  }}
                />
              </div>
            ))}
      </div>
    );
  }

  render() {
    const { series, annotations = [], config = {}, startTime } = this.props;

    // Convert timestamps to relative time
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

    const processedAnnotations = annotations.map((ann, index) => {
      const relativeTime = ann.timestamp - startTime;
      const minutes = Math.floor(relativeTime / 60000);
      const seconds = Math.floor((relativeTime % 60000) / 1000);
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Check for overlapping annotations within 1 second and offset them slightly
      const overlapThreshold = 1000; // 1 second in milliseconds
      let adjustedTime = relativeTime;

      const overlappingAnnotations = annotations
        .slice(0, index)
        .filter(
          (prevAnn) => Math.abs(prevAnn.timestamp - startTime - relativeTime) < overlapThreshold,
        );

      if (overlappingAnnotations.length > 0) {
        // Offset by 200ms per overlapping annotation to create visual separation
        adjustedTime = relativeTime + overlappingAnnotations.length * 200;
      }

      return {
        x: adjustedTime,
        originalX: relativeTime, // Keep original time for tooltip
        label: ann.label || (ann.spell ? ann.spell.name : 'Event'),
        color: ann.color || this.getAnnotationColor(ann.type),
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
          grid: config.showXGrid !== false && config.showGrid !== false,
          title: 'Time',
        },
        scale: { zero: true, nice: false },
      },
      y: {
        field: 'y',
        type: 'quantitative' as const,
        axis: {
          labelExpr: this.getYAxisFormat(config.yAxisFormat),
          title: config.yAxisLabel || null,
          tickCount: 5,
          grid: config.showYGrid !== false && config.showGrid !== false,
        },
        scale: {
          zero: config.yAxisMin === undefined ? true : false,
          domain:
            config.yAxisMin !== undefined || config.yAxisMax !== undefined
              ? [config.yAxisMin || 0, config.yAxisMax || 100]
              : undefined,
        },
      },
    };

    // Create layers for each series
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

    // Add annotation layer if annotations exist
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
                  scale: null, // Use the actual color values
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
      title: config.title
        ? {
            text: config.title,
            color: '#e9e8e7',
            fontSize: 16,
          }
        : undefined,

      layer: [...seriesLayers, ...annotationLayers],
    };

    // Prepare data for the chart
    const chartData: Record<string, unknown> = {
      annotations: processedAnnotations,
    };

    processedSeries.forEach((s, index) => {
      chartData[`series_${index}`] = s.data;
    });

    return (
      <div>
        {config.title && <h3 style={{ color: '#e9e8e7', marginBottom: '16px' }}>{config.title}</h3>}

        {/* Custom legend showing exact colors from our data */}
        {this.renderCustomLegend(series, annotations)}

        <AutoSizer disableHeight>
          {({ width }) => (
            <BaseChart
              height={config.height || 400}
              width={config.width || width}
              spec={spec}
              data={chartData}
            />
          )}
        </AutoSizer>
      </div>
    );
  }
}

export default GeneralizedChart;
