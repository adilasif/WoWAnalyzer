import { ReactNode } from 'react';
import { formatNumber, formatPercentage } from 'common/format';
import { Talent } from 'common/TALENTS/types';
import Spell from 'common/SPELLS/Spell';
import Statistic, { StatisticSize } from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemDamageDone from 'parser/ui/ItemDamageDone';

type ValueFormatter = 'number' | 'percentage' | 'raw';

interface StatValue {
  value: number | string;
  label: string;
  format?: ValueFormatter;
}

/**
 * Fluent builder for creating statistics with consistent styling
 *
 * @example
 * ```tsx
 * // Simple damage statistic
 * statistic() {
 *   return new StatisticBuilder()
 *     .spell(TALENTS.ARCANE_BOMBARDMENT_TALENT)
 *     .damage(this.bonusDamage)
 *     .build();
 * }
 *
 * // Multi-value statistic
 * statistic() {
 *   return new StatisticBuilder()
 *     .spell(SPELLS.ARCANE_HARMONY_BUFF)
 *     .value(this.bonusDamage, 'Bonus Damage', 'number')
 *     .value(this.dpsIncrease, 'DPS', 'number')
 *     .value(this.averageStacks, 'Avg. stacks', 'number')
 *     .build();
 * }
 *
 * // Custom content with tooltip
 * statistic() {
 *   return new StatisticBuilder()
 *     .spell(TALENTS.ARCANE_ECHO_TALENT)
 *     .content(<><SpellIcon spell={TALENTS.ARCANE_ECHO_TALENT} /> {formatNumber(this.avg)} <small>Average</small></>)
 *     .tooltip(<>Custom tooltip content</>)
 *     .build();
 * }
 * ```
 */
export class StatisticBuilder {
  private _spell?: Spell | Talent;
  private _category: STATISTIC_CATEGORY = STATISTIC_CATEGORY.TALENTS;
  private _size: StatisticSize = 'flexible';
  private _position?: number;
  private _tooltip?: ReactNode;
  private _dropdown?: ReactNode;
  private _values: StatValue[] = [];
  private _content?: ReactNode;
  private _damageAmount?: number;

  /** Set the spell/talent for this statistic */
  spell(spell: Spell | Talent): this {
    this._spell = spell;
    return this;
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

  /** Set dropdown content (expandable section) */
  dropdown(dropdown: ReactNode): this {
    this._dropdown = dropdown;
    return this;
  }

  /** Add a formatted value line */
  value(value: number | string, label: string, format: ValueFormatter = 'raw'): this {
    this._values.push({ value, label, format });
    return this;
  }

  /** Set damage amount (uses ItemDamageDone component) */
  damage(amount: number): this {
    this._damageAmount = amount;
    return this;
  }

  /** Set custom content (overrides values and damage) */
  content(content: ReactNode): this {
    this._content = content;
    return this;
  }

  /** Build and return the Statistic component */
  build(): ReactNode {
    if (!this._spell) {
      throw new Error('StatisticBuilder: spell is required');
    }

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
