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
  precision?: number;
  icon?: ReactNode;
}

const defaultValues: StatValueConfig[] = [];
interface MageStatisticProps {
  spell: Spell | Talent;
  category?: STATISTIC_CATEGORY;
  size?: StatisticSize;
  position?: number;
  tooltip?: ReactNode;
  dropdown?: ReactNode;
  damageAmount?: number;
  values?: StatValueConfig[];
  children?: ReactNode;
}

/**
 * Statistic component for Mage abilities.
 * Handles common formatting patterns and provides consistent styling.
 */
export default function MageStatistic({
  spell,
  category = STATISTIC_CATEGORY.GENERAL,
  size = 'flexible',
  position,
  tooltip,
  dropdown,
  damageAmount,
  values = defaultValues,
  children,
}: MageStatisticProps): JSX.Element {
  let content: ReactNode;

  if (children !== undefined) {
    content = children;
  } else if (damageAmount !== undefined && values.length > 0) {
    content = (
      <>
        <ItemDamageDone amount={damageAmount} />
        <br />
        {values.map((item, idx) => {
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
              {idx < values.length - 1 && <br />}
            </span>
          );
        })}
      </>
    );
  } else if (damageAmount !== undefined) {
    content = <ItemDamageDone amount={damageAmount} />;
  } else if (values.length > 0) {
    content = (
      <>
        {values.map((item, idx) => {
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
              {idx < values.length - 1 && <br />}
            </span>
          );
        })}
      </>
    );
  }

  return (
    <Statistic
      category={category}
      size={size}
      position={position}
      tooltip={tooltip}
      dropdown={dropdown}
    >
      <BoringSpellValueText spell={spell}>{content}</BoringSpellValueText>
    </Statistic>
  );
}
