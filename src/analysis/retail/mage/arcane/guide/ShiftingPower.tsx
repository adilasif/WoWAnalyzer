import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { BaseMageGuide, MageGuideComponents, createRuleset } from '../../shared/guide';
import ShiftingPowerArcane, { MAX_TICKS, ShiftingPowerCast } from '../talents/ShiftingPower';
import SPELLS from 'common/SPELLS';

class ShiftingPowerGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    shiftingPower: ShiftingPowerArcane,
  };

  protected shiftingPower!: ShiftingPowerArcane;

  private perCastBreakdown(cast: ShiftingPowerCast): React.ReactNode {
    const inConservePhase =
      !cast.cdsActive.arcaneSurge && !cast.cdsActive.touchOfTheMagi && !cast.cdsActive.siphonStorm;

    // Create rules for evaluation
    const ruleset = createRuleset(cast, this)
      .createRule({
        id: 'fullDuration',
        check: () => cast.ticks >= MAX_TICKS,
        failureText: `${cast.ticks}/${MAX_TICKS} ticks`,
        successText: `${cast.ticks}/${MAX_TICKS} ticks`,
        label: <>Channeled full duration</>,
      })
      .createRule({
        id: 'arcaneSurgeOnCD',
        check: () => cast.spellsReduced.arcaneSurge,
        failureText: 'NOT on CD',
        successText: 'on CD',
        label: (
          <>
            <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} /> Cooldown
          </>
        ),
      })
      .createRule({
        id: 'touchOnCD',
        check: () => cast.spellsReduced.touchOfTheMagi,
        failureText: 'NOT on CD',
        successText: 'on CD',
        label: (
          <>
            <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} /> Cooldown
          </>
        ),
      })
      .createRule({
        id: 'evocationOnCD',
        check: () => cast.spellsReduced.evocation,
        failureText: 'NOT on CD',
        successText: 'on CD',
        label: (
          <>
            <SpellLink spell={TALENTS.EVOCATION_TALENT} /> Cooldown
          </>
        ),
      })
      .createRule({
        id: 'conservePhase',
        check: () => inConservePhase,
        failureText: 'In burn phase!',
        successText: 'In conserve phase',
        label: <>Timing (Conserve Phase)</>,
      })
      .createRule({
        id: 'noArcaneSurgeActive',
        check: () => !cast.cdsActive.arcaneSurge,
        failureText: 'Arcane Surge active!',
        successText: 'Arcane Surge not active',
        active: () => cast.cdsActive.arcaneSurge,
        label: (
          <>
            <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} /> Not Active
          </>
        ),
      })
      .createRule({
        id: 'noTouchActive',
        check: () => !cast.cdsActive.touchOfTheMagi,
        failureText: 'Touch active!',
        successText: 'Touch not active',
        active: () => cast.cdsActive.touchOfTheMagi,
        label: (
          <>
            <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} /> Not Active
          </>
        ),
      })
      .createRule({
        id: 'noSiphonActive',
        check: () => !cast.cdsActive.siphonStorm,
        failureText: 'Siphon Storm active!',
        successText: 'Siphon Storm not active',
        active: () => cast.cdsActive.siphonStorm,
        label: (
          <>
            <SpellLink spell={SPELLS.SIPHON_STORM_BUFF} /> Not Active
          </>
        ),
      })
      .goodIf([
        'fullDuration',
        'arcaneSurgeOnCD',
        'touchOnCD',
        'evocationOnCD',
        'conservePhase',
        'noArcaneSurgeActive',
        'noTouchActive',
        'noSiphonActive',
      ]);

    // Get rule results and performance
    const ruleResults = ruleset.getRuleResults();
    const performance = ruleset.getPerformance();

    return MageGuideComponents.createExpandableCastItem(
      TALENTS.SHIFTING_POWER_TALENT,
      cast.timestamp,
      this.owner,
      ruleResults,
      performance,
      cast.ordinal,
    );
  }

  get guideSubsection(): JSX.Element {
    const shiftingPower = <SpellLink spell={TALENTS.SHIFTING_POWER_TALENT} />;
    const evocation = <SpellLink spell={TALENTS.EVOCATION_TALENT} />;
    const arcaneSurge = <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} />;
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;

    const explanation = (
      <>
        <div>
          <strong>{shiftingPower}</strong> reduces your active cooldowns while you channel. Use it
          when your major abilites ({arcaneSurge}, {touchOfTheMagi}, and {evocation}) are all on
          cooldown, after the burn phase is concluded. Do not clip ticks.
        </div>
      </>
    );

    const castBreakdowns = this.shiftingPower.casts.map((cast) => this.perCastBreakdown(cast));

    const dataComponents =
      this.shiftingPower.casts.length > 0
        ? [MageGuideComponents.createExpandableCastBreakdown(castBreakdowns)]
        : [MageGuideComponents.createNoUsageComponent(TALENTS.SHIFTING_POWER_TALENT)];

    return MageGuideComponents.createSubsection(explanation, dataComponents, 'Shifting Power');
  }
}

export default ShiftingPowerGuide;
