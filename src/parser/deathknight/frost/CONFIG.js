import React from 'react';

import { Khazak } from 'CONTRIBUTORS';
import retryingPromise from 'common/retryingPromise';
import SPECS from 'game/SPECS';

import CHANGELOG from './CHANGELOG';

export default {
  // The people that have contributed to this spec recently. People don't have to sign up to be long-time maintainers to be included in this list. If someone built a large part of the spec or contributed something recently to that spec, they can be added to the contributors list. If someone goes MIA, they may be removed after major changes or during a new expansion.
  contributors: [Khazak],
  // The WoW client patch this spec was last updated to be fully compatible with.
  patchCompatibility: '8.0.1',
  // If set to  false`, the spec will show up as unsupported.
  isSupported: true,
  // Explain the status of this spec's analysis here. Try to mention how complete it is, and perhaps show links to places users can learn more.
  // If this spec's analysis does not show a complete picture please mention this in the `<Warning>` component.
  description: (
    <>
      Welcome to the Frost Death Knight analyzer! This analyzer only has basic support but I hope you find what is here to be useful.  If you have any comments or suggestions feel free to contact Khazak(Khazak#3360) on Discord.<br /><br />

      <br />More resources for Frost:<br />
      <a href="https://discord.gg/acherus" target="_blank" rel="noopener noreferrer">Death Knight Class Discord</a> <br />
      <a href="http://www.wowhead.com/frost-death-knight-guide" target="_blank" rel="noopener noreferrer">Wowhead Guide</a> <br />
      <a href="https://www.icy-veins.com/wow/frost-death-knight-pve-dps-guide" target="_blank" rel="noopener noreferrer">Icy Veins Guide</a> <br />
    </>
  ),
  // A recent example report to see interesting parts of the spec. Will be shown on the homepage.
  exampleReport: '/report/D4wCaZgKjAXLnMPV/16-Heroic+Vectis+-+Kill+(5:14)/13-Jayshawn',

  // Don't change anything below this line;
  // The current spec identifier. This is the only place (in code) that specifies which spec this parser is about.
  spec: SPECS.FROST_DEATH_KNIGHT,
  // The contents of your changelog.
  changelog: CHANGELOG,
  // The CombatLogParser class for your spec.
  parser: () => retryingPromise(() => import('./CombatLogParser' /* webpackChunkName: "FrostDeathKnight" */).then(exports => exports.default)),
  // The path to the current directory (relative form project root). This is used for generating a GitHub link directly to your spec's code.
  path: __dirname,
};