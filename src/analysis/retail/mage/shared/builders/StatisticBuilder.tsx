import { ReactNode } from 'react';
import { formatNumber, formatPercentage } from 'common/format';
import { Talent } from 'common/TALENTS/types';
import Spell from 'common/SPELLS/Spell';
import Statistic, { StatisticSize } from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemDamageDone from 'parser/ui/ItemDamageDone';

type ValueFormatter = 'number' | 'percentage' | 'raw';

interface StatValueConfig {
  value: number | string;
  label: string;
  format?: ValueFormatter;
  icon?: ReactNode;
}

interface ColumnConfig<T = unknown> {
  header: ReactNode;
  getValue: (data: T) => ReactNode;
  isHeader?: boolean;
}

/**
 * Builder for creating dropdown tables with consistent styling
 *
 * @example
 * ```tsx
 * // Define columns and add data
 * const dropdown = new DropdownTableBuilder()
 *   .column('Haste-Bonus', (data) => `${formatPercentage(data.stacks * 0.02, 0)}%`, true)
 *   .column('Time (s)', (data) => formatDuration(data.time))
 *   .column('Time (%)', (data) => `${formatPercentage(data.time / this.owner.fightDuration)}%`)
 *   .data(this.stackData);
 *
 * // Or add rows individually
 * const dropdown = new DropdownTableBuilder()
 *   .column('Haste-Bonus', (d) => d.haste, true)
 *   .column('Time (s)', (d) => d.time)
 *   .addRow({ haste: '5%', time: '10s' })
 *   .addRow({ haste: '10%', time: '20s' });
 * ```
 */
export class DropdownTableBuilder<T = unknown> {
  private _columns: ColumnConfig<T>[] = [];
  private _data: T[] = [];

  /**
   * Add a column definition
   * @param header - The header text for this column
   * @param getValue - Function to extract the value from data object
   * @param isHeader - Whether this column should render as <th> (default: false)
   */
  column(header: ReactNode, getValue: (data: T) => ReactNode, isHeader = false): this {
    this._columns.push({ header, getValue, isHeader });
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
                if (col.isHeader) {
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
 * // Simple damage statistic
 * statistic() {
 *   return new StatisticBuilder(TALENTS.ARCANE_BOMBARDMENT_TALENT)
 *     .damage({ amount: this.bonusDamage })
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
    icon?: ReactNode;
  }): this {
    this._values.push({
      value: config.value,
      label: config.label,
      format: config.format,
      icon: config.icon,
    });
    return this;
  }

  /** Set damage amount (uses ItemDamageDone component) */
  damage(config: { amount: number }): this {
    this._damageAmount = config.amount;
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
    // Damage display
    else if (this._damageAmount !== undefined) {
      content = <ItemDamageDone amount={this._damageAmount} />;
    }
    // Formatted values
    else if (this._values.length > 0) {
      content = (
        <>
          {this._values.map((item, idx) => {
            let formattedValue: string | number = item.value;
            if (item.format === 'number' && typeof item.value === 'number') {
              formattedValue = formatNumber(item.value);
            } else if (item.format === 'percentage' && typeof item.value === 'number') {
              formattedValue = formatPercentage(item.value);
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
