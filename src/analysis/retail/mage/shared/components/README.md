# Generalized Chart System

A simplified, reusable chart system that replaces the complex ManaChart implementation and can be used for various visualizations across different specs and classes.

## Features

- **Easy to use**: Fluent builder pattern for creating charts
- **Flexible**: Support for multiple data series (line, area, bar charts)
- **Annotations**: Easy spell cast, buff, damage, and custom event annotations
- **Built-in patterns**: Common patterns like mana tracking, buff uptime, health tracking
- **Spell integration**: Automatic spell icons and tooltips
- **Responsive**: Auto-sizing and mobile-friendly
- **Performant**: Built on Vega-Lite for optimal rendering

## Quick Start

```tsx
import { createChart } from 'analysis/retail/mage/shared/components';

const MyChart = ({ parser }) => {
  const chart = createChart(parser.fight.start_time, parser.fight.end_time)
    .setTitle('Resource Management')
    .addManaTracking(manaValues.manaUpdates)
    .addCastAnnotations(
      arcaneSurgeCasts.map((cast) => ({
        timestamp: cast.timestamp,
        spell: TALENTS.ARCANE_SURGE_TALENT,
      })),
    )
    .build();

  return <div>{chart}</div>;
};
```

## API Reference

### ChartBuilder Methods

#### Data Series

- `addSeries(config)` - Add custom data series
- `addManaTracking(manaUpdates)` - Add mana percentage tracking
- `addHealthTracking(healthUpdates)` - Add health percentage tracking
- `addBuffUptime(name, buffHistory, color?)` - Add buff uptime visualization

#### Annotations

- `addCastAnnotations(casts, color?)` - Add spell cast markers
- `addBuffAnnotations(buffs, color?)` - Add buff application markers
- `addDamageAnnotations(damage, color?)` - Add damage taken markers
- `addDeathAnnotations(deaths, color?)` - Add death markers
- `addCustomAnnotations(events)` - Add custom event markers

#### Configuration

- `setTitle(title)` - Set chart title
- `setYAxis(config)` - Configure Y-axis (label, format, min/max)
- `setConfig(config)` - Set advanced chart configuration

#### Build

- `build()` - Return the React component

## Examples

### Basic Mana Chart

```tsx
const manaChart = createChart(startTime, endTime)
  .setTitle('Mana Usage')
  .setYAxis({ label: 'Mana %', format: 'percentage', min: 0, max: 100 })
  .addManaTracking(manaUpdates)
  .build();
```

### Resource Chart with Cooldowns

```tsx
const resourceChart = createChart(startTime, endTime)
  .setTitle('Resources & Cooldowns')
  .addManaTracking(manaUpdates)
  .addBuffUptime('Arcane Power', arcanePowerHistory, '#FF6B35')
  .addCastAnnotations(majorCooldowns, '#A855F7')
  .build();
```

### Multi-Series Performance Chart

```tsx
const performanceChart = createChart(startTime, endTime)
  .setTitle('Performance Metrics')
  .addSeries({
    name: 'DPS',
    data: dpsOverTime,
    color: '#4CAF50',
    type: 'line',
  })
  .addSeries({
    name: 'Mana %',
    data: manaPercentages,
    color: '#2196F3',
    type: 'area',
    opacity: 0.7,
  })
  .addCastAnnotations(cooldownCasts)
  .addDamageAnnotations(majorDamageEvents)
  .build();
```

### Buff Uptime Analysis

```tsx
const buffChart = createChart(startTime, endTime)
  .setTitle('Buff Uptimes')
  .setYAxis({ label: 'Active', format: 'percentage' })
  .addBuffUptime('Arcane Intellect', buffHistory1, '#2196F3')
  .addBuffUptime('Time Warp', buffHistory2, '#FF9800')
  .addBuffUptime('Siphon Storm', buffHistory3, '#9C27B0')
  .build();
```

## Data Formats

### TimeValue

```tsx
interface TimeValue {
  timestamp: number; // Absolute timestamp
  value: number; // Y-axis value
}
```

### AnnotationEvent

```tsx
interface AnnotationEvent {
  timestamp: number;
  spell?: Spell; // Spell for icon/tooltip
  label?: string; // Custom label
  color?: string; // Override color
  type?: 'cast' | 'buff' | 'debuff' | 'damage' | 'heal' | 'death' | 'custom';
}
```

### DataSeries

```tsx
interface DataSeries {
  name: string;
  data: TimeValue[];
  color?: string;
  backgroundColor?: string;
  type?: 'line' | 'area' | 'bar';
  opacity?: number;
  strokeWidth?: number;
}
```

## Migration from ManaChart

**Before (Complex):**

- Multiple files and components
- Manual Vega-Lite configuration
- Complex data transformation
- Difficult to extend

**After (Simple):**

```tsx
// Replace entire ManaChart implementation with:
const chart = createChart(startTime, endTime)
  .setTitle('Mana Management')
  .addManaTracking(manaUpdates)
  .addCastAnnotations(casts)
  .build();
```

## Benefits

1. **90% less code** for common chart patterns
2. **Consistent styling** across all charts
3. **Easy to extend** with new annotation types
4. **Reusable** across different specs and classes
5. **Type-safe** TypeScript implementation
6. **Performance optimized** with Vega-Lite
7. **Mobile responsive** with auto-sizing

## Advanced Usage

For advanced customization, you can still access the underlying `GeneralizedChart` component directly:

```tsx
import { GeneralizedChart } from 'analysis/retail/mage/shared/components';

<GeneralizedChart
  series={customSeries}
  annotations={customAnnotations}
  config={advancedConfig}
  startTime={startTime}
  endTime={endTime}
/>;
```
