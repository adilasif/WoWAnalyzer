import Analyzer from 'parser/core/Analyzer';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import EventHistory from 'parser/shared/modules/EventHistory';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import Enemies from 'parser/shared/modules/Enemies';

/**
 * Base analyzer class for Mage specs with common helper methods.
 * Extends the standard Analyzer with mage-specific utilities.
 *
 * All helper methods automatically access the required dependencies (selectedCombatant,
 * spellUsable, abilityTracker, enemies, etc.) so you don't need to pass them manually.
 *
 */
export default class MageAnalyzer extends Analyzer {
  static dependencies = {
    ...Analyzer.dependencies,
    spellUsable: SpellUsable,
    eventHistory: EventHistory,
    abilityTracker: AbilityTracker,
    enemies: Enemies,
  };

  protected spellUsable!: SpellUsable;
  protected eventHistory!: EventHistory;
  protected abilityTracker!: AbilityTracker;
  protected enemies!: Enemies;
}
