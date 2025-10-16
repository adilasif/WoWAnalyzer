import type Spell from 'common/SPELLS/Spell';
import { SpellIcon } from 'interface';

interface NoCastsMessageProps {
  spell: Spell;
}

/**
 * Displays message when no casts of a talented spell are recorded
 */
export const NoCastsMessage = ({ spell }: NoCastsMessageProps) => (
  <div>
    <SpellIcon spell={spell} /> <strong>No {spell.name} casts recorded.</strong>
    <br />
    <small>
      Make sure you are using this spell if it is available to you and you are specced into it.
    </small>
  </div>
);
