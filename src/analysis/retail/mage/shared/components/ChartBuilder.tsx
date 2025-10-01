import React from 'react';
import Spell from 'common/SPELLS/Spell';
import GeneralizedChart, {
  TimeValue,
  AnnotationEvent,
  DataSeries,
  ChartConfig,
} from './GeneralizedChart';

/**
 * Simplified builder for creating charts with common patterns
 * Makes it easy to create resource tracking, cooldown timelines, etc.
 */
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

  constructor(startTime: number, endTime: number) {
    this.startTime = startTime;
    this.endTime = endTime;
  }

  /**
   * Add a data series to the chart
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
   * Add mana tracking (common pattern)
   */
  addManaTracking(
    manaUpdates: Array<{ timestamp: number; current: number; max: number }>,
  ): ChartBuilder {
    let manaData: Array<{ timestamp: number; value: number }>;

    if (manaUpdates && manaUpdates.length > 0) {
      // Add initial mana point like the old ManaChart did
      const initial = manaUpdates[0].current / manaUpdates[0].max;
      manaData = [{ timestamp: this.startTime, value: 100 * initial }];

      // Add all mana update points
      const processedUpdates = manaUpdates.map((update) => ({
        timestamp: Math.max(update.timestamp, this.startTime),
        value: (update.current / update.max) * 100,
      }));

      manaData.push(...processedUpdates);
    } else {
      // Fallback: assume full mana throughout fight if no data
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
   * Add health tracking
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
   * Add buff/debuff uptime tracking
   */
  addBuffUptime(
    name: string,
    buffHistory: Array<{ start: number; end: number }>,
    color?: string,
  ): ChartBuilder {
    const uptimeData: TimeValue[] = [];

    // Create step function for buff uptime
    let currentTime = this.startTime;
    let isActive = false;

    const sortedBuffs = [...buffHistory].sort((a, b) => a.start - b.start);

    for (const buff of sortedBuffs) {
      // Add point before buff starts (if not active)
      if (!isActive && buff.start > currentTime) {
        uptimeData.push({ timestamp: currentTime, value: 0 });
        uptimeData.push({ timestamp: buff.start, value: 0 });
      }

      // Buff starts
      uptimeData.push({ timestamp: buff.start, value: 100 });
      isActive = true;

      // Buff ends
      uptimeData.push({ timestamp: buff.end, value: 100 });
      uptimeData.push({ timestamp: buff.end, value: 0 });
      isActive = false;
      currentTime = buff.end;
    }

    // Fill to end of fight if needed
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
   * Add spell cast annotations
   */
  addCastAnnotations(
    casts: Array<{ timestamp: number; spell: Spell }>,
    color?: string,
  ): ChartBuilder {
    casts.forEach((cast) => {
      this.annotations.push({
        timestamp: cast.timestamp,
        spell: cast.spell,
        type: 'cast',
        color: color || '#4CAF50',
      });
    });
    return this;
  }

  /**
   * Add buff application annotations
   */
  addBuffAnnotations(
    buffs: Array<{ timestamp: number; spell: Spell }>,
    color?: string,
  ): ChartBuilder {
    buffs.forEach((buff) => {
      this.annotations.push({
        timestamp: buff.timestamp,
        spell: buff.spell,
        type: 'buff',
        color: color || '#2196F3',
      });
    });
    return this;
  }

  /**
   * Add damage taken annotations
   */
  addDamageAnnotations(
    damage: Array<{ timestamp: number; spell?: Spell; label?: string }>,
    color?: string,
  ): ChartBuilder {
    damage.forEach((dmg) => {
      this.annotations.push({
        timestamp: dmg.timestamp,
        spell: dmg.spell,
        label: dmg.label,
        type: 'damage',
        color: color || '#F44336',
      });
    });
    return this;
  }

  /**
   * Add death annotations
   */
  addDeathAnnotations(
    deaths: Array<{ timestamp: number; label?: string }>,
    color?: string,
  ): ChartBuilder {
    deaths.forEach((death) => {
      this.annotations.push({
        timestamp: death.timestamp,
        label: death.label || 'Death',
        type: 'death',
        color: color || '#D32F2F',
      });
    });
    return this;
  }

  /**
   * Add custom event annotations
   */
  addCustomAnnotations(
    events: Array<{ timestamp: number; label: string; color?: string }>,
  ): ChartBuilder {
    events.forEach((event) => {
      this.annotations.push({
        timestamp: event.timestamp,
        label: event.label,
        type: 'custom',
        color: event.color || '#9E9E9E',
      });
    });
    return this;
  }

  /**
   * Add boss health tracking (common pattern for mana charts)
   */
  addBossHealth(bossHealthData: Array<{ timestamp: number; value: number }>): ChartBuilder {
    return this.addSeries({
      name: 'Boss Health',
      data: bossHealthData,
      color: '#FF4444',
      type: 'line',
      opacity: 0.8,
    });
  }

  /**
   * Add low resource warnings (common pattern)
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

    return this.addCustomAnnotations(warnings);
  }

  /**
   * Configure as a typical mana chart
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
   * Get boss health data for the current fight
   *
   * ⚠️ **ASYNC METHOD**: This method fetches data from the WarcraftLogs API and must be awaited.
   * Consider using `buildWithBossHealth()` instead if you want automatic async handling.
   *
   * @param reportCode - The WarcraftLogs report code
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

      // Type assertion for boss health response
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
   * Configure chart appearance
   */
  setConfig(config: Partial<ChartConfig>): ChartBuilder {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Set grid line configuration
   */
  setGridLines(options: { showXGrid?: boolean; showYGrid?: boolean }): ChartBuilder {
    this.config.showXGrid = options.showXGrid;
    this.config.showYGrid = options.showYGrid;
    return this;
  }

  /**
   * Set chart title
   */
  setTitle(title: string): ChartBuilder {
    this.config.title = title;
    return this;
  }

  /**
   * Set Y-axis configuration
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
   * Build and return the chart component
   */
  build(): JSX.Element {
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

  /**
   * Build chart with boss health data fetched automatically
   *
   * ⚠️ **ASYNC WARNING**: This method returns a React component that performs asynchronous
   * data fetching on mount. The chart will show a "Loading chart data..." message while
   * fetching boss health data from the WCL API.
   *
   * **How it works:**
   * 1. Returns a wrapper component that fetches boss health data on mount
   * 2. Shows loading state while fetching
   * 3. Rebuilds the chart with boss health data once loaded
   * 4. If fetch fails or returns no data, builds chart without boss health
   *
   * **Usage example:**
   * ```tsx
   * // In a guide component
   * const chart = new ChartBuilder(info.fightStart, info.fightEnd)
   *   .addManaTracking(manaUpdates)
   *   .addCastAnnotations(casts)
   *   .asManaChart()
   *   .buildWithBossHealth(info.report.code);
   *
   * return <div>{chart}</div>;
   * ```
   *
   * **Alternative (synchronous):**
   * If you need synchronous rendering or want to handle boss health fetching yourself,
   * use `build()` instead and manage the async data externally:
   * ```tsx
   * const [bossHealth, setBossHealth] = useState<Array<{timestamp: number, value: number}>>();
   *
   * useEffect(() => {
   *   builder.fetchBossHealth(reportCode).then(setBossHealth);
   * }, []);
   *
   * const chart = builder
   *   .addManaTracking(manaUpdates)
   *   .addBossHealth(bossHealth || [])
   *   .build();
   * ```
   *
   * @param reportCode - The WarcraftLogs report code to fetch boss health data from
   * @returns A React component that handles async boss health loading and renders the chart
   */
  buildWithBossHealth(reportCode: string): JSX.Element {
    const ChartWithAsyncBossHealth: React.FC = () => {
      const [bossHealthData, setBossHealthData] = React.useState<Array<{
        timestamp: number;
        value: number;
      }> | null>(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        const loadBossHealth = async () => {
          const data = await this.fetchBossHealth(reportCode);
          setBossHealthData(data);
          setLoading(false);
        };
        loadBossHealth();
      }, []);

      if (loading) {
        return <div>Loading chart data...</div>;
      }

      // Clone builder and add boss health if available
      const finalBuilder = new ChartBuilder(this.startTime, this.endTime);
      finalBuilder.series = [...this.series];
      finalBuilder.annotations = [...this.annotations];
      finalBuilder.config = { ...this.config };

      if (bossHealthData) {
        finalBuilder.addBossHealth(bossHealthData);
      }

      return finalBuilder.build();
    };

    return <ChartWithAsyncBossHealth />;
  }
}

/**
 * Convenience function to create a new chart builder
 */
export function createChart(startTime: number, endTime: number): ChartBuilder {
  return new ChartBuilder(startTime, endTime);
}

export default ChartBuilder;
