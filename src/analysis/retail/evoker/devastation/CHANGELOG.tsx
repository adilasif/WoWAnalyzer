import { change, date } from 'common/changelog';
import { Vollmer } from 'CONTRIBUTORS';
import SpellLink from 'interface/SpellLink';
import TALENTS from 'common/TALENTS/evoker';

export default [
  change(date(2026, 1, 17), <>Update <SpellLink spell={TALENTS.IMMINENT_DESTRUCTION_DEVASTATION_TALENT}/> module for Midnight.</>, Vollmer),
  change(date(2026, 1, 12), "Update core talent modules and improve Disintegrate analysis accuracy", Vollmer),
  change(date(2026, 1, 9), "Initial Midnight support", Vollmer),
];
