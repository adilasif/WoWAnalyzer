import React from 'react';
import Spell from 'common/SPELLS/Spell';
import GeneralizedChart, {
  TimeValue,
  AnnotationEvent,
  DataSeries,
  ChartConfig,
} from '../components/GeneralizedChart';

export class ChartBuilder {
  private series: DataSeries[] = [];
  private annotations: AnnotationEvent[] = [];
  private config: ChartConfig = {
    height: 400,
    showGrid: true,
    showLegend: true,
    legendPosition: 'top',
  };
  private startTime: number;
  private endTime: number;
  private shouldFetchBossHealth = false;
  private reportCode?: string;

  constructor(startTime: number, endTime: number) {
    this.startTime = startTime;
    this.endTime = endTime;
  }

  /**
   * Adds a data series to the chart.
   * @param config Series configuration
   * @param config.name Name of the series
   * @param config.data Array of timestamp-value pairs to plot
   * @param config.color Color for the series
   * @param config.type Type of visualization
   * @param config.opacity Opacity for the series
   * @returns This builder for method chaining
   */
  addSeries(config: {
    name: string;
    data: TimeValue[];
    color?: string;
    type?: 'line' | 'area' | 'bar';
    opacity?: number;
  }): ChartBuilder {
    this.series.push({
      name: config.name,
      data: config.data,
      color: config.color,
      type: config.type || 'line',
      opacity: config.opacity,
      backgroundColor: config.color ? config.color + '40' : undefined,
    });
    return this;
  }

  /**
   * Adds mana tracking.
   * @param manaUpdates Array of mana update events
   * @returns This builder for method chaining
   */
  addManaTracking(
    manaUpdates: Array<{ timestamp: number; current: number; max: number }>,
  ): ChartBuilder {
    let manaData: Array<{ timestamp: number; value: number }>;

    if (manaUpdates && manaUpdates.length > 0) {
      const initial = manaUpdates[0].current / manaUpdates[0].max;
      manaData = [{ timestamp: this.startTime, value: 100 * initial }];

      const processedUpdates = manaUpdates.map((update) => ({
        timestamp: Math.max(update.timestamp, this.startTime),
        value: (update.current / update.max) * 100,
      }));

      manaData.push(...processedUpdates);
    } else {
      manaData = [
        { timestamp: this.startTime, value: 100 },
        { timestamp: this.endTime, value: 100 },
      ];
    }

    return this.addSeries({
      name: manaUpdates && manaUpdates.length > 0 ? 'Mana' : 'Mana (No Data)',
      data: manaData,
      color: '#2196F3',
      type: 'area',
      opacity: 0.7,
    });
  }

  /**
   * Adds health tracking.
   * @param healthUpdates Array of health update events
   * @returns This builder for method chaining
   */
  addHealthTracking(
    healthUpdates: Array<{ timestamp: number; current: number; max: number }>,
  ): ChartBuilder {
    const healthPercentages = healthUpdates.map((update) => ({
      timestamp: update.timestamp,
      value: (update.current / update.max) * 100,
    }));

    return this.addSeries({
      name: 'Health',
      data: healthPercentages,
      color: '#4CAF50',
      type: 'area',
      opacity: 0.7,
    });
  }

  /**
   * Adds buff/debuff uptime tracking.
   * @param name Name of the buff/debuff
   * @param buffHistory Array of buff application periods
   * @param color Color for the uptime visualization
   * @returns This builder for method chaining
   */
  addBuffUptime(
    name: string,
    buffHistory: Array<{ start: number; end: number }>,
    color?: string,
  ): ChartBuilder {
    const uptimeData: TimeValue[] = [];

    let currentTime = this.startTime;
    let isActive = false;

    const sortedBuffs = [...buffHistory].sort((a, b) => a.start - b.start);

    for (const buff of sortedBuffs) {
      if (!isActive && buff.start > currentTime) {
        uptimeData.push({ timestamp: currentTime, value: 0 });
        uptimeData.push({ timestamp: buff.start, value: 0 });
      }

      uptimeData.push({ timestamp: buff.start, value: 100 });
      isActive = true;

      uptimeData.push({ timestamp: buff.end, value: 100 });
      uptimeData.push({ timestamp: buff.end, value: 0 });
      isActive = false;
      currentTime = buff.end;
    }

    if (currentTime < this.endTime) {
      uptimeData.push({ timestamp: this.endTime, value: isActive ? 100 : 0 });
    }

    return this.addSeries({
      name,
      data: uptimeData,
      color: color || '#FF9800',
      type: 'line',
    });
  }

  /**
   * Adds annotations to the chart.
   * @param config Annotation configuration
   * @param config.events Array of events with timestamp and additional fields
   * @param config.type Type of annotation
   * @param config.color Color override
   * @returns This builder for method chaining
   */
  addAnnotations(config: {
    events: Array<{
      timestamp: number;
      spell?: Spell;
      label?: string;
      color?: string;
    }>;
    type: 'cast' | 'buff' | 'damage' | 'death' | 'custom';
    color?: string;
  }): ChartBuilder {
    const defaultColors = {
      cast: '#4CAF50',
      buff: '#2196F3',
      damage: '#F44336',
      death: '#D32F2F',
      custom: '#9E9E9E',
    };

    config.events.forEach((event) => {
      this.annotations.push({
        timestamp: event.timestamp,
        spell: event.spell,
        label: event.label || (config.type === 'death' ? 'Death' : undefined),
        type: config.type,
        color: event.color || config.color || defaultColors[config.type],
      });
    });
    return this;
  }

  /**
   * Adds boss health tracking.
   * @param dataOrReportCode Either boss health data points or a WCL report code
   * @returns This builder for method chaining
   */
  addBossHealth(
    dataOrReportCode: Array<{ timestamp: number; value: number }> | string,
  ): ChartBuilder {
    if (typeof dataOrReportCode === 'string') {
      this.shouldFetchBossHealth = true;
      this.reportCode = dataOrReportCode;
    } else {
      return this.addSeries({
        name: 'Boss Health',
        data: dataOrReportCode,
        color: '#FF4444',
        type: 'line',
        opacity: 0.8,
      });
    }
    return this;
  }

  /**
   * Adds low resource warnings.
   * @param resourceData Array of resource update events
   * @param threshold Threshold percentage below which to show warnings
   * @param label Label for the warning annotations
   * @param color Color for the warning markers
   * @returns This builder for method chaining
   */
  addLowResourceWarnings(
    resourceData: Array<{ timestamp: number; current: number; max: number }>,
    threshold = 0.1,
    label = 'Low Resource',
    color = '#EF4444',
  ): ChartBuilder {
    const warnings = resourceData
      .filter(
        (update) =>
          update.current / update.max < threshold && update.timestamp > this.startTime + 30000,
      )
      .map((update) => ({
        timestamp: update.timestamp,
        label,
        color,
      }));

    return this.addAnnotations({ events: warnings, type: 'custom' });
  }

  /**
   * Configures as a typical mana chart.
   * @returns This builder for method chaining
   */
  asManaChart(): ChartBuilder {
    return this.setYAxis({
      label: 'Percentage',
      format: 'percentage',
      min: 0,
      max: 100,
    })
      .setGridLines({
        showXGrid: false, // No vertical grid lines
        showYGrid: true, // Keep horizontal grid lines
      })
      .setConfig({
        showLegend: false, // Disable the top chart legend
      });
  }

  /**
   * Gets boss health data for the current fight.
   * @param reportCode The WarcraftLogs report code
   * @returns Promise that resolves to boss health data points, or null if fetch fails
   */
  async fetchBossHealth(
    reportCode: string,
  ): Promise<Array<{ timestamp: number; value: number }> | null> {
    try {
      const fetchWcl = (await import('common/fetchWclApi')).default;
      const json = await fetchWcl(`report/graph/resources/${reportCode}`, {
        start: this.startTime,
        end: this.endTime,
        sourceclass: 'Boss',
        hostility: 'Enemies',
        abilityid: 1000,
      });

      const bossData = json as { series?: Array<{ data: Array<[number, number]> }> };

      if (bossData?.series?.[0]?.data) {
        return bossData.series[0].data.map((dataPoint: [number, number]) => ({
          timestamp: dataPoint[0],
          value: dataPoint[1],
        }));
      }
    } catch (error) {
      console.error('Failed to load boss health data:', error);
    }
    return null;
  }

  /**
   * Configures chart appearance.
   * @param config Partial chart configuration to merge with existing config
   * @returns This builder for method chaining
   */
  setConfig(config: Partial<ChartConfig>): ChartBuilder {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Sets grid line configuration.
   * @param options Grid line visibility options
   * @param options.showXGrid Whether to show vertical grid lines
   * @param options.showYGrid Whether to show horizontal grid lines
   * @returns This builder for method chaining
   */
  setGridLines(options: { showXGrid?: boolean; showYGrid?: boolean }): ChartBuilder {
    this.config.showXGrid = options.showXGrid;
    this.config.showYGrid = options.showYGrid;
    return this;
  }

  /**
   * Sets chart title.
   * @param title The title to display above the chart
   * @returns This builder for method chaining
   */
  setTitle(title: string): ChartBuilder {
    this.config.title = title;
    return this;
  }

  /**
   * Sets Y-axis configuration.
   * @param config Y-axis configuration options
   * @param config.label Label to display on the Y-axis
   * @param config.format Format for Y-axis values
   * @param config.min Minimum value for Y-axis
   * @param config.max Maximum value for Y-axis
   * @returns This builder for method chaining
   */
  setYAxis(config: {
    label?: string;
    format?: 'percentage' | 'number' | 'time';
    min?: number;
    max?: number;
  }): ChartBuilder {
    this.config.yAxisLabel = config.label;
    this.config.yAxisFormat = config.format;
    this.config.yAxisMin = config.min;
    this.config.yAxisMax = config.max;
    return this;
  }

  /**
   * Builds and returns the chart component.
   * @returns The chart component
   */
  build(): JSX.Element {
    if (this.shouldFetchBossHealth && this.reportCode) {
      const currentSeries = [...this.series];
      const currentAnnotations = [...this.annotations];
      const currentConfig = { ...this.config };
      const startTime = this.startTime;
      const endTime = this.endTime;
      const reportCode = this.reportCode;

      const ChartWithAsyncBossHealth: React.FC = () => {
        const [bossHealthData, setBossHealthData] = React.useState<Array<{
          timestamp: number;
          value: number;
        }> | null>(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const loadBossHealth = async () => {
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

              if (bossData?.series?.[0]?.data) {
                const healthData = bossData.series[0].data.map((dataPoint: [number, number]) => ({
                  timestamp: dataPoint[0],
                  value: dataPoint[1],
                }));
                setBossHealthData(healthData);
              } else {
                setBossHealthData(null);
              }
            } catch (error) {
              console.error('Failed to load boss health data:', error);
              setBossHealthData(null);
            } finally {
              setLoading(false);
            }
          };
          loadBossHealth();
        }, []);

        if (loading) {
          return <div>Loading chart data...</div>;
        }

        const finalSeries = [...currentSeries];
        if (bossHealthData && bossHealthData.length > 0) {
          finalSeries.push({
            name: 'Boss Health',
            data: bossHealthData,
            color: '#FF4444',
            type: 'line' as const,
            opacity: 0.8,
            backgroundColor: '#FF444440',
          });
        }

        return (
          <GeneralizedChart
            series={finalSeries}
            annotations={currentAnnotations}
            config={currentConfig}
            startTime={startTime}
            endTime={endTime}
          />
        );
      };

      return <ChartWithAsyncBossHealth />;
    }

    return (
      <GeneralizedChart
        series={this.series}
        annotations={this.annotations}
        config={this.config}
        startTime={this.startTime}
        endTime={this.endTime}
      />
    );
  }
}

/**
 * Convenience function to create a new chart builder
 */
export function createChart(startTime: number, endTime: number): ChartBuilder {
  return new ChartBuilder(startTime, endTime);
}

export default ChartBuilder;
