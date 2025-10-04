import { ReactNode } from 'react';
import { formatNumber, formatPercentage } from 'common/format';
import { Talent } from 'common/TALENTS/types';
import Spell from 'common/SPELLS/Spell';
import Statistic, { StatisticSize } from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import DamageIcon from 'interface/icons/Damage';

type ValueFormatter = 'number' | 'percentage' | 'raw';

interface StatValueConfig {
  value: number | string;
  label: string;
  format?: ValueFormatter;
  precision?: number;
  icon?: ReactNode;
}

interface ColumnConfig<T = unknown> {
  header: ReactNode;
  getValue: (data: T) => ReactNode;
}

/**
 * Builder for creating dropdown tables with consistent styling
 *
 * @example
 * ```tsx
 * // Define columns with positional parameters (first column automatically becomes row header)
 * const dropdown = new DropdownTableBuilder()
 *   .column('Stacks', (data) => `${data.stacks}`)  // First column cells render as <th>
 *   .column('Time (s)', (data) => formatDuration(data.time))
 *   .column('Time (%)', (data) => `${formatPercentage(data.time / this.owner.fightDuration)}%`)
 *   .data(this.stackData);
 *
 * // Or use config objects for columns
 * const dropdown = new DropdownTableBuilder()
 *   .column({ header: 'Stacks', getValue: (d) => d.stacks })  // First column cells render as <th>
 *   .column({ header: 'Time (s)', getValue: (d) => d.time })
 *   .addRow({ stacks: 5, time: 1000 })
 *   .addRow({ stacks: 10, time: 2000 });
 * ```

 */
export class DropdownTableBuilder<T = unknown> {
  private _columns: ColumnConfig<T>[] = [];
  private _data: T[] = [];

  /**
   * Add a column definition
   * @param headerOrConfig - Either the header text, or a config object with { header, getValue }
   * @param getValue - Function to extract the value from data object (optional if using config object)
   */
  column(headerOrConfig: ReactNode | ColumnConfig<T>, getValue?: (data: T) => ReactNode): this {
    // If first argument is an object with getValue property, treat it as a config object
    if (
      typeof headerOrConfig === 'object' &&
      headerOrConfig !== null &&
      'getValue' in headerOrConfig
    ) {
      this._columns.push(headerOrConfig as ColumnConfig<T>);
    } else {
      // Otherwise, treat it as the old positional parameters
      if (!getValue) {
        throw new Error('getValue function is required when using positional parameters');
      }
      this._columns.push({ header: headerOrConfig, getValue });
    }
    return this;
  }

  /**
   * Set all data at once (array of data objects)
   */
  data(data: T[]): this {
    this._data = data;
    return this;
  }

  /**
   * Add a single row of data
   */
  addRow(row: T): this {
    this._data.push(row);
    return this;
  }

  /** Build and return the table JSX */
  build(): ReactNode {
    return (
      <table className="table table-condensed">
        {this._columns.length > 0 && (
          <thead>
            <tr>
              {this._columns.map((col, idx) => (
                <th key={idx}>{col.header}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {this._data.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {this._columns.map((col, colIdx) => {
                const value = col.getValue(row);
                // First column is always a row header
                if (colIdx === 0) {
                  return <th key={colIdx}>{value}</th>;
                }
                return <td key={colIdx}>{value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}

/**
 * Fluent builder for creating statistics with consistent styling
 *
 * @example
 * ```tsx
 * // Single DPS statistic (shows damage per second with percentage)
 * statistic() {
 *   return new StatisticBuilder(TALENTS.ARCANE_BOMBARDMENT_TALENT)
 *     .dps({ amount: this.bonusDamage })
 *     .build();
 * }
 *
 * // Multiple DPS values with labels
 * statistic() {
 *   return new StatisticBuilder(SPELLS.ARCANE_HARMONY_BUFF)
 *     .dps({ amount: this.dpsValue1, label: 'Bonus DPS' })
 *     .dps({ amount: this.dpsValue2, label: 'DPS Increase' })
 *     .build();
 * }
 *
 * // Average damage statistic (shows raw damage amount)
 * statistic() {
 *   return new StatisticBuilder(TALENTS.ARCANE_ECHO_TALENT)
 *     .averageDamage({ amount: this.averageDamage })
 *     .build();
 * }
 *
 * // Multi-value statistic
 * statistic() {
 *   return new StatisticBuilder(SPELLS.ARCANE_HARMONY_BUFF)
 *     .value({ value: this.bonusDamage, label: 'Bonus Damage', format: 'number' })
 *     .value({ value: this.dpsIncrease, label: 'DPS', format: 'number' })
 *     .value({ value: this.averageStacks, label: 'Avg. stacks', format: 'number' })
 *     .build();
 * }
 *
 * // Value with custom icon
 * statistic() {
 *   return new StatisticBuilder(TALENTS.ARCANE_TEMPO_TALENT)
 *     .value({ value: this.averageHaste, label: 'average haste gained', format: 'percentage', icon: <HasteIcon /> })
 *     .build();
 * }
 *
 * // Custom content with tooltip
 * statistic() {
 *   return new StatisticBuilder(TALENTS.ARCANE_ECHO_TALENT)
 *     .content({
 *       content: <><SpellIcon spell={TALENTS.ARCANE_ECHO_TALENT} /> {formatNumber(this.avg)} <small>Average</small></>,
 *       tooltip: <>Custom tooltip content</>,
 *     })
 *     .build();
 * }
 *
 * // Statistic with dropdown table
 * statistic() {
 *   const dropdown = new DropdownTableBuilder()
 *     .column('Haste-Bonus', (data) => `${formatPercentage(data.haste, 0)}%`, true)
 *     .column('Time (s)', (data) => formatDuration(data.time))
 *     .column('Time (%)', (data) => `${formatPercentage(data.pct)}%`)
 *     .data(this.stackData);
 *
 *   return new StatisticBuilder(TALENTS.ARCANE_TEMPO_TALENT)
 *     .value({ value: this.averageHaste, label: 'average haste', format: 'percentage', icon: <HasteIcon /> })
 *     .dropdown(dropdown)
 *     .build();
 * }
 * ```
 */
export class StatisticBuilder {
  private _spell: Spell | Talent;
  private _category: STATISTIC_CATEGORY = STATISTIC_CATEGORY.GENERAL;
  private _size: StatisticSize = 'flexible';
  private _position?: number;
  private _tooltip?: ReactNode;
  private _dropdown?: ReactNode;
  private _values: StatValueConfig[] = [];
  private _content?: ReactNode;
  private _damageAmount?: number;

  constructor(spell: Spell | Talent) {
    this._spell = spell;
  }

  /** Set the statistic category */
  category(category: STATISTIC_CATEGORY): this {
    this._category = category;
    return this;
  }

  /** Set the statistic size */
  size(size: StatisticSize): this {
    this._size = size;
    return this;
  }

  /** Set the statistic position */
  position(position: number): this {
    this._position = position;
    return this;
  }

  /** Set a tooltip to display on hover */
  tooltip(tooltip: ReactNode): this {
    this._tooltip = tooltip;
    return this;
  }

  /** Set dropdown content (expandable section) - accepts ReactNode or DropdownTableBuilder */
  dropdown(dropdown: ReactNode | DropdownTableBuilder): this {
    if (dropdown instanceof DropdownTableBuilder) {
      this._dropdown = dropdown.build();
    } else {
      this._dropdown = dropdown;
    }
    return this;
  }

  /** Add a formatted value line */
  value(config: {
    value: number | string;
    label: string;
    format?: ValueFormatter;
    precision?: number;
    icon?: ReactNode;
  }): this {
    this._values.push({
      value: config.value,
      label: config.label,
      format: config.format,
      precision: config.precision,
      icon: config.icon,
    });
    return this;
  }

  /** Set DPS damage amount (uses ItemDamageDone component, or formats as DPS value with custom label) */
  dps(config: { amount: number; label?: string }): this {
    if (config.label) {
      // Custom label = format as value line for multiple DPS displays
      // Assumes amount is already damage per second, or is total damage to be converted
      this._values.push({
        value: config.amount,
        label: config.label,
        format: 'number',
        icon: <DamageIcon />,
      });
    } else {
      // No label = use ItemDamageDone component for single DPS display
      this._damageAmount = config.amount;
    }
    return this;
  }

  /** Set average damage amount (shows raw damage number) */
  averageDamage(config: { amount: number; label?: string }): this {
    this._values.push({
      value: config.amount,
      label: config.label ?? 'Average Damage',
      format: 'number',
      icon: <DamageIcon />,
    });
    return this;
  }

  /** @deprecated Use .dps() or .averageDamage() instead for clarity */
  damage(config: { amount: number; label?: string }): this {
    if (config.label) {
      return this.averageDamage({ amount: config.amount, label: config.label });
    } else {
      return this.dps({ amount: config.amount });
    }
    return this;
  }

  /** Set custom content (overrides values and damage) */
  content(config: { content: ReactNode; tooltip?: ReactNode }): this {
    this._content = config.content;
    if (config.tooltip !== undefined) {
      this._tooltip = config.tooltip;
    }
    return this;
  }

  /** Build and return the Statistic component */
  build(): ReactNode {
    let content: ReactNode;

    // Custom content takes priority
    if (this._content !== undefined) {
      content = this._content;
    }
    // Damage display with additional values
    else if (this._damageAmount !== undefined && this._values.length > 0) {
      content = (
        <>
          <ItemDamageDone amount={this._damageAmount} />
          <br />
          {this._values.map((item, idx) => {
            let formattedValue: string | number = item.value;
            if (item.format === 'number' && typeof item.value === 'number') {
              // If precision is specified, use toFixed(), otherwise use formatNumber
              formattedValue =
                item.precision !== undefined
                  ? item.value.toFixed(item.precision)
                  : formatNumber(item.value);
            } else if (item.format === 'percentage' && typeof item.value === 'number') {
              formattedValue = formatPercentage(item.value, item.precision);
            }

            return (
              <span key={idx}>
                {item.icon && <>{item.icon} </>}
                {formattedValue} <small>{item.label}</small>
                {idx < this._values.length - 1 && <br />}
              </span>
            );
          })}
        </>
      );
    }
    // Damage display only
    else if (this._damageAmount !== undefined) {
      content = <ItemDamageDone amount={this._damageAmount} />;
    }
    // Formatted values only
    else if (this._values.length > 0) {
      content = (
        <>
          {this._values.map((item, idx) => {
            let formattedValue: string | number = item.value;
            if (item.format === 'number' && typeof item.value === 'number') {
              // If precision is specified, use toFixed(), otherwise use formatNumber
              formattedValue =
                item.precision !== undefined
                  ? item.value.toFixed(item.precision)
                  : formatNumber(item.value);
            } else if (item.format === 'percentage' && typeof item.value === 'number') {
              formattedValue = formatPercentage(item.value, item.precision);
            }

            return (
              <span key={idx}>
                {item.icon && <>{item.icon} </>}
                {formattedValue} <small>{item.label}</small>
                {idx < this._values.length - 1 && <br />}
              </span>
            );
          })}
        </>
      );
    }

    return (
      <Statistic
        category={this._category}
        size={this._size}
        position={this._position}
        tooltip={this._tooltip}
        dropdown={this._dropdown}
      >
        <BoringSpellValueText spell={this._spell}>{content}</BoringSpellValueText>
      </Statistic>
    );
  }
}
