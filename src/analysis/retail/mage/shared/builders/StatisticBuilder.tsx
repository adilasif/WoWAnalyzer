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
 */
export class DropdownTableBuilder<T = unknown> {
  private _columns: ColumnConfig<T>[] = [];
  private _data: T[] = [];

  /**
   * Adds a column definition.
   * @param headerOrConfig Either the header text, or a config object
   * @param getValue Function to extract the value from data object
   * @returns This builder for method chaining
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
   * Sets all data at once.
   * @param data Array of data objects
   * @returns This builder for method chaining
   */
  data(data: T[]): this {
    this._data = data;
    return this;
  }

  /**
   * Adds a single row of data.
   * @param row The data row to add
   * @returns This builder for method chaining
   */
  addRow(row: T): this {
    this._data.push(row);
    return this;
  }

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

  /**
   * Sets the statistic category.
   * @param category The statistic category
   * @returns This builder for method chaining
   */
  category(category: STATISTIC_CATEGORY): this {
    this._category = category;
    return this;
  }

  /**
   * Sets the statistic size.
   * @param size The statistic size
   * @returns This builder for method chaining
   */
  size(size: StatisticSize): this {
    this._size = size;
    return this;
  }

  /**
   * Sets the statistic position.
   * @param position The position value
   * @returns This builder for method chaining
   */
  position(position: number): this {
    this._position = position;
    return this;
  }

  /**
   * Sets a tooltip to display on hover.
   * @param tooltip The tooltip content
   * @returns This builder for method chaining
   */
  tooltip(tooltip: ReactNode): this {
    this._tooltip = tooltip;
    return this;
  }

  /**
   * Sets dropdown content.
   * @param dropdown The dropdown content or DropdownTableBuilder
   * @returns This builder for method chaining
   */
  dropdown(dropdown: ReactNode | DropdownTableBuilder): this {
    if (dropdown instanceof DropdownTableBuilder) {
      this._dropdown = dropdown.build();
    } else {
      this._dropdown = dropdown;
    }
    return this;
  }

  /**
   * Adds a formatted value line.
   * @param config Value configuration
   * @param config.value The value to display
   * @param config.label Label for the value
   * @param config.format Format type
   * @param config.precision Number precision
   * @param config.icon Icon to display with the value
   * @returns This builder for method chaining
   */
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

  /**
   * Sets DPS damage amount.
   * @param config DPS configuration
   * @param config.amount The damage amount
   * @param config.label Optional custom label
   * @returns This builder for method chaining
   */
  dps(config: { amount: number; label?: string }): this {
    if (config.label) {
      this._values.push({
        value: config.amount,
        label: config.label,
        format: 'number',
        icon: <DamageIcon />,
      });
    } else {
      this._damageAmount = config.amount;
    }
    return this;
  }

  /**
   * Sets average damage amount.
   * @param config Average damage configuration
   * @param config.amount The damage amount
   * @param config.label Optional custom label
   * @returns This builder for method chaining
   */
  averageDamage(config: { amount: number; label?: string }): this {
    this._values.push({
      value: config.amount,
      label: config.label ?? 'Average Damage',
      format: 'number',
      icon: <DamageIcon />,
    });
    return this;
  }

  /**
   * Sets custom content.
   * @param config Content configuration
   * @param config.content The custom content
   * @param config.tooltip Optional tooltip
   * @returns This builder for method chaining
   */
  content(config: { content: ReactNode; tooltip?: ReactNode }): this {
    this._content = config.content;
    if (config.tooltip !== undefined) {
      this._tooltip = config.tooltip;
    }
    return this;
  }

  /**
   * Builds and returns the Statistic component.
   * @returns The statistic component
   */
  build(): ReactNode {
    let content: ReactNode;

    if (this._content !== undefined) {
      content = this._content;
    } else if (this._damageAmount !== undefined && this._values.length > 0) {
      content = (
        <>
          <ItemDamageDone amount={this._damageAmount} />
          <br />
          {this._values.map((item, idx) => {
            let formattedValue: string | number = item.value;
            if (item.format === 'number' && typeof item.value === 'number') {
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
    } else if (this._damageAmount !== undefined) {
      content = <ItemDamageDone amount={this._damageAmount} />;
    } else if (this._values.length > 0) {
      content = (
        <>
          {this._values.map((item, idx) => {
            let formattedValue: string | number = item.value;
            if (item.format === 'number' && typeof item.value === 'number') {
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
