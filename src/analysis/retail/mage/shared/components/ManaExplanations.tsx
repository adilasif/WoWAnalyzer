import React from 'react';
import TALENTS from 'common/TALENTS/mage';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import Explanation from 'interface/guide/components/Explanation';

/**
 * Pre-built explanation for Arcane Mage mana management
 */
export const ArcaneManaExplanation: React.FC = () => {
  const arcaneSurgeLink = <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} />;
  const touchOfTheMagiLink = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
  const evocationLink = <SpellLink spell={TALENTS.EVOCATION_TALENT} />;
  const arcaneBarrageLink = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;

  return (
    <Explanation>
      <div>
        <b>Mana Management</b> is crucial for Arcane Mage performance. Proper mana usage involves:
      </div>
      <div>
        <ul>
          <li>
            <strong>Burn Phase:</strong> Use {arcaneSurgeLink} and {touchOfTheMagiLink} while
            maintaining mana for the full duration. Don't go OOM during major cooldowns.
          </li>
          <li>
            <strong>Conserve Phase:</strong> Use {arcaneBarrageLink} at 4 stacks to maintain mana
            efficiency while waiting for cooldowns.
          </li>
          <li>
            <strong>Mana Recovery:</strong> Use {evocationLink} to restore mana during conserve
            phases or between burn windows.
          </li>
          <li>
            <strong>Fight Ending:</strong> Aim to end fights with minimal mana remaining - unused
            mana is wasted potential damage.
          </li>
        </ul>
      </div>
    </Explanation>
  );
};
