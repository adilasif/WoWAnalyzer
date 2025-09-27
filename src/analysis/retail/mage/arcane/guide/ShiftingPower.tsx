import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BaseMageGuide, GuideComponents, evaluateGuide } from '../../shared/guide';
import ShiftingPowerArcane, { MAX_TICKS, ShiftingPowerCast } from '../talents/ShiftingPower';

class ShiftingPowerGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    shiftingPower: ShiftingPowerArcane,
  };

  protected shiftingPower!: ShiftingPowerArcane;

  private perCastBreakdown(cast: ShiftingPowerCast): React.ReactNode {
    const inConservePhase =
      !cast.cdsActive.arcaneSurge && !cast.cdsActive.touchOfTheMagi && !cast.cdsActive.siphonStorm;
    const fullDuration = cast.ticks >= MAX_TICKS;
    const allMajorCdsOnCooldown =
      cast.spellsReduced.arcaneSurge &&
      cast.spellsReduced.touchOfTheMagi &&
      cast.spellsReduced.evocation;

    return evaluateGuide(cast.timestamp, cast, this, {
      actionName: 'Shifting Power',

      // FAIL: Critical issues that make the cast bad
      failConditions: [
        {
          name: 'burnPhaseUsage',
          check: !inConservePhase,
          description:
            'Used during burn phase - should only be used in conserve phase when major CDs are down',
        },
        {
          name: 'arcaneSurgeActive',
          check: cast.cdsActive.arcaneSurge,
          description: 'Arcane Surge active - wasting burn phase potential',
        },
        {
          name: 'touchActive',
          check: cast.cdsActive.touchOfTheMagi,
          description: 'Touch of the Magi active - wasting burn phase potential',
        },
        {
          name: 'siphonActive',
          check: cast.cdsActive.siphonStorm,
          description: 'Siphon Storm active - wasting burn phase potential',
        },
        {
          name: 'clippedChannel',
          check: cast.ticks < MAX_TICKS,
          description: `${cast.ticks}/${MAX_TICKS} ticks - clipped channel reduces cooldown reduction effectiveness`,
        },
      ],

      // PERFECT: Optimal usage
      perfectConditions: [
        {
          name: 'perfectTiming',
          check: inConservePhase && fullDuration && allMajorCdsOnCooldown,
          description:
            'Perfect - used in conserve phase with full duration and all major CDs on cooldown',
        },
      ],

      // GOOD: Acceptable usage patterns
      goodConditions: [
        {
          name: 'goodConserveUsage',
          check: inConservePhase && fullDuration,
          description: 'Good - used in conserve phase with full duration',
        },
        {
          name: 'goodCooldownTiming',
          check: allMajorCdsOnCooldown,
          description: 'Good - all major cooldowns being reduced (Arcane Surge, Touch, Evocation)',
        },
        {
          name: 'fullDuration',
          check: fullDuration,
          description: `${cast.ticks}/${MAX_TICKS} ticks - full channel duration`,
        },
      ],

      // OK: Understandable but suboptimal
      okConditions: [
        {
          name: 'conservePhase',
          check: inConservePhase,
          description: 'Used in conserve phase - correct timing',
        },
        {
          name: 'someCooldownReduction',
          check:
            cast.spellsReduced.arcaneSurge ||
            cast.spellsReduced.touchOfTheMagi ||
            cast.spellsReduced.evocation,
          description: 'Reducing some major cooldowns',
        },
      ],

      defaultPerformance: QualitativePerformance.Fail,
      defaultMessage: `${cast.ticks}/${MAX_TICKS} ticks - check timing and duration`,
    });
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
        ? [GuideComponents.createExpandableCastBreakdown(castBreakdowns)]
        : [GuideComponents.createNoUsageComponent(TALENTS.SHIFTING_POWER_TALENT)];

    return GuideComponents.createSubsection(explanation, dataComponents, 'Shifting Power');
  }
}

export default ShiftingPowerGuide;
