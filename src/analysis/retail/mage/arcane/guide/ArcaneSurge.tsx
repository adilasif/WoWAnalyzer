import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { SpellSeq } from 'parser/ui/SpellSeq';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { BaseMageGuide, GuideComponents, evaluateGuide } from '../../shared/guide';

import ArcaneSurge from '../core/ArcaneSurge';
import { ARCANE_CHARGE_MAX_STACKS } from '../../shared';

const OPENER_DURATION = 20000;

class ArcaneSurgeGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    arcaneSurge: ArcaneSurge,
  };

  protected arcaneSurge!: ArcaneSurge;

  hasSiphonStorm: boolean = this.selectedCombatant.hasTalent(TALENTS.EVOCATION_TALENT);
  hasNetherPrecision: boolean = this.selectedCombatant.hasTalent(TALENTS.NETHER_PRECISION_TALENT);

  get arcaneSurgeData(): BoxRowEntry[] {
    return this.arcaneSurge.surgeCasts.map((cast) => {
      const opener = cast.cast - this.owner.fight.start_time < OPENER_DURATION;
      const hasMaxCharges = cast.charges === ARCANE_CHARGE_MAX_STACKS || opener;
      const fightTimeRemaining = this.owner.fight.end_time - cast.cast;
      const shortFight = fightTimeRemaining < 60000; // Less than 1 minute remaining

      return evaluateGuide(cast.cast, cast, this, {
        actionName: 'Arcane Surge',

        // REQUIREMENTS: Must have charges (unless opener)
        requirements: [
          {
            name: 'charges',
            check: hasMaxCharges,
            failureMessage: opener
              ? `Opener with ${cast.charges}/${ARCANE_CHARGE_MAX_STACKS} charges`
              : `Only ${cast.charges}/${ARCANE_CHARGE_MAX_STACKS} charges - need 4 or cast Arcane Orb first`,
          },
        ],

        // FAIL: Things that waste the cooldown
        failConditions: [
          {
            name: 'aboutToDie',
            check: !shortFight && fightTimeRemaining < 30000,
            description: 'Wasted cooldown - fight ending soon and not short encounter',
          },
        ],

        // PERFECT: Optimal cooldown usage with all buffs
        perfectConditions: [
          {
            name: 'allBuffsCombo',
            check:
              hasMaxCharges &&
              (!this.hasSiphonStorm || cast.siphonStormBuff) &&
              (!this.hasNetherPrecision || cast.netherPrecision),
            description:
              'Perfect combo: max charges + all available buffs (Siphon Storm + Nether Precision)',
          },
          {
            name: 'openerPerfect',
            check:
              opener &&
              (!this.hasSiphonStorm || cast.siphonStormBuff) &&
              (!this.hasNetherPrecision || cast.netherPrecision),
            description: 'Perfect opener with available buffs',
          },
        ],

        // GOOD: Acceptable usage patterns
        goodConditions: [
          {
            name: 'maxChargesGood',
            check: hasMaxCharges && (cast.siphonStormBuff || cast.netherPrecision),
            description: `Good usage: ${cast.charges} charges + ${cast.siphonStormBuff ? 'Siphon Storm' : ''}${cast.siphonStormBuff && cast.netherPrecision ? ' + ' : ''}${cast.netherPrecision ? 'Nether Precision' : ''}`,
          },
          {
            name: 'emergencyUsage',
            check: hasMaxCharges && shortFight,
            description: 'Good emergency usage - short fight/encounter ending',
          },
        ],

        // OK: Basic usage without optimization
        okConditions: [
          {
            name: 'basicUsage',
            check: hasMaxCharges,
            description: opener
              ? `Opener usage with ${cast.charges} charges`
              : `Basic usage with ${cast.charges} charges - could optimize with buffs`,
          },
        ],

        defaultPerformance: undefined, // Let it fall through to Fail if requirements not met
        defaultMessage: 'Suboptimal Arcane Surge usage',
      });
    });
  }

  get guideSubsection(): JSX.Element {
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const arcaneSurge = <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} />;
    const evocation = <SpellLink spell={TALENTS.EVOCATION_TALENT} />;
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;
    const arcaneMissiles = <SpellLink spell={TALENTS.ARCANE_MISSILES_TALENT} />;
    const netherPrecision = <SpellLink spell={TALENTS.NETHER_PRECISION_TALENT} />;
    const siphonStorm = <SpellLink spell={SPELLS.SIPHON_STORM_BUFF} />;

    const explanation = (
      <>
        <div>
          <b>{arcaneSurge}</b> is your primary damage cooldown and will essentially convert all of
          your mana into damage. Because of this, there are a few things that you should do to
          ensure you maximize the amount of damage that {arcaneSurge} does:
        </div>
        <div>
          <ul>
            <li>
              Ensure you have 4 {arcaneCharge}s. Cast {arcaneOrb} if you have less than 4.
            </li>
            <li>
              Full channel {evocation} before each {arcaneSurge} cast to cap your mana and grant an
              intellect buff from {siphonStorm}.
            </li>
            <li>
              Channeling {evocation} will give you a {clearcasting} proc. Cast {arcaneMissiles} to
              get {netherPrecision} before {arcaneSurge}
            </li>
          </ul>
        </div>
        <div>
          When incorporating the above items, your spell sequence will look like this:{' '}
          <SpellSeq
            spells={[
              TALENTS.EVOCATION_TALENT,
              TALENTS.ARCANE_MISSILES_TALENT,
              SPELLS.ARCANE_ORB,
              TALENTS.ARCANE_SURGE_TALENT,
            ]}
          />
        </div>
      </>
    );
    const dataComponents = [
      GuideComponents.createPerCastSummary(TALENTS.ARCANE_SURGE_TALENT, this.arcaneSurgeData),
    ];

    return GuideComponents.createSubsection(explanation, dataComponents, 'Arcane Surge');
  }
}

export default ArcaneSurgeGuide;
