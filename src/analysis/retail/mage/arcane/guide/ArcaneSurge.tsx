import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { SpellSeq } from 'parser/ui/SpellSeq';
import {
  BaseMageGuide,
  MageGuideComponents,
  createRuleset,
  type GuideLike,
} from '../../shared/guide';

import ArcaneSurge, { ArcaneSurgeCast } from '../core/ArcaneSurge';
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

  private perCastBreakdown(cast: ArcaneSurgeCast): React.ReactNode {
    const opener = cast.cast - this.owner.fight.start_time < OPENER_DURATION;

    // Create rules for evaluation
    const ruleset = createRuleset<ArcaneSurgeCast>(cast, this as GuideLike)
      .createRule({
        id: 'maxCharges',
        check: () => cast.charges === ARCANE_CHARGE_MAX_STACKS || opener,
        failureText: `Only ${cast.charges} charges`,
        successText:
          cast.charges === ARCANE_CHARGE_MAX_STACKS
            ? `${cast.charges} charges`
            : `${cast.charges} charges (Opener)`,
        label: (
          <>
            <SpellLink spell={SPELLS.ARCANE_CHARGE} />s Before Surge
          </>
        ),
      })

      .createRule({
        id: 'siphonStorm',
        active: this.selectedCombatant.hasTalent(TALENTS.EVOCATION_TALENT),
        check: () => cast.siphonStormBuff,
        failureText: 'Buff Missing',
        successText: 'Buff Active',
        label: (
          <>
            <SpellLink spell={SPELLS.SIPHON_STORM_BUFF} /> Active
          </>
        ),
      })

      .createRule({
        id: 'netherPrecision',
        active: this.selectedCombatant.hasTalent(TALENTS.NETHER_PRECISION_TALENT),
        check: () => cast.netherPrecision,
        failureText: 'Buff Missing',
        successText: 'Buff Active',
        label: (
          <>
            <SpellLink spell={TALENTS.NETHER_PRECISION_TALENT} /> Active
          </>
        ),
      })

      .goodIf(['maxCharges', 'siphonStorm', 'netherPrecision']);

    // Get rule results and performance
    const ruleResults = ruleset.getRuleResults();
    const performance = ruleset.getPerformance();

    return MageGuideComponents.createExpandableCastItem(
      TALENTS.ARCANE_SURGE_TALENT,
      cast.cast,
      this.owner,
      ruleResults,
      performance,
      cast.ordinal,
    );
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
    const castBreakdowns = this.arcaneSurge.surgeCasts.map((cast) => this.perCastBreakdown(cast));

    const dataComponents = [MageGuideComponents.createExpandableCastBreakdown(castBreakdowns)];

    return MageGuideComponents.createSubsection(explanation, dataComponents, 'Arcane Surge');
  }
}

export default ArcaneSurgeGuide;
