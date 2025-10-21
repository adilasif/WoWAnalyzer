import Spell from 'common/SPELLS/Spell';
import { useAnalyzer } from 'interface/guide';
import Abilities from 'parser/core/modules/Abilities';
import { CooldownBar, GapHighlight } from 'parser/ui/CooldownBar';

interface CooldownTimelineProps {
  spell: Spell;
}

/**
 * Displays a cooldown timeline bar showing when a spell was cast and when it was available.
 * @param spell - The spell to display timeline for
 */
export default function CooldownTimeline({ spell }: CooldownTimelineProps) {
  const ability = useAnalyzer(Abilities)!.getAbility(spell.id);
  const hasCharges = ability && ability.charges > 1;
  const gapHighlightMode = hasCharges ? GapHighlight.All : GapHighlight.FullCooldown;

  return (
    <div>
      <strong>Cooldown Timeline</strong>
      <small>
        {hasCharges ? (
          <> - yellow when cooling down, red when all charges available, white lines show casts.</>
        ) : (
          <> - red gaps are times the spell was available but not cast, white lines show casts.</>
        )}
      </small>
      <CooldownBar spellId={spell.id} gapHighlightMode={gapHighlightMode} minimizeIcons />
    </div>
  );
}
