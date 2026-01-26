import { change, date } from 'common/changelog';
import { TALENTS_PALADIN } from 'common/TALENTS/paladin';
import { swirl } from 'CONTRIBUTORS';
import SpellLink from 'interface/SpellLink';

export default [
  change(date(2026, 1, 27), <>Updated <SpellLink spell={TALENTS_PALADIN.CRUSADERS_MIGHT_TALENT} /> module.</>, swirl),
  change(date(2026, 1, 3), <>Initial Holy Paladin support for Midnight.</>, swirl),
];
