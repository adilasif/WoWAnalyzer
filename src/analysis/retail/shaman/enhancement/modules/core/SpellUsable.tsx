import { AbilityEvent, CastEvent, EventType } from 'parser/core/Events';
import CoreSpellUsable from 'parser/shared/modules/SpellUsable';
import TALENTS from 'common/TALENTS/shaman';
import SPELLS from 'common/SPELLS/shaman';
import { addEnhancedCastReason } from 'parser/core/EventMetaLib';
import SpellLink from 'interface/SpellLink';

const RESET_BUFFER_MS = 100;

class SpellUsable extends CoreSpellUsable.withDependencies({
  ...CoreSpellUsable.dependencies,
}) {
  beginCooldown(
    triggeringEvent: AbilityEvent<any>,
    spellId: number = triggeringEvent.ability.guid,
  ) {
    if (triggeringEvent.type === EventType.FreeCast) {
      return;
    }

    super.beginCooldown(triggeringEvent, spellId);
  }

  public isAvailable(spellId: number): boolean {
    switch (spellId) {
      case SPELLS.STORMSTRIKE_CAST.id:
        return (
          !this.selectedCombatant.hasBuff(TALENTS.ASCENDANCE_ENHANCEMENT_TALENT) &&
          super.isAvailable(spellId)
        );
      case SPELLS.WINDSTRIKE_CAST.id:
        return (
          this.selectedCombatant.hasBuff(TALENTS.ASCENDANCE_ENHANCEMENT_TALENT) &&
          super.isAvailable(spellId)
        );
      default:
        return super.isAvailable(spellId);
    }
  }
}

export default SpellUsable;
