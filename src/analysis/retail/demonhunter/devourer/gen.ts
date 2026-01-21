import genAbilities from 'parser/core/modules/genAbilities';
import spells from './spell-list_DemonHunter_Devourer.retail';

export const Abilities = genAbilities({
  allSpells: spells,
  rotational: [spells.CONSUME, spells.CULL, spells.DEVOUR],
  cooldowns: [],
  defensives: [spells.BLUR],
  omit: [],
  overrides: {
    // these are enabled by void metamorphosis. the spell data is pretty jank. TODO ExecuteHelper.
    [spells.CULL.id]: (_combatant, generated) => ({ ...generated!, enabled: true }),
    [spells.DEVOUR.id]: (_combatant, generated) => ({ ...generated!, enabled: true }),
  },
});
