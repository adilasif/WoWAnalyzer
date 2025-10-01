import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import Analyzer from 'parser/core/Analyzer';
import {
  evaluateEvents,
  createExpandableConfig,
  generateExpandableBreakdown,
  ExpandableConfig,
} from '../../shared/guide';
import { GuideBuilder } from '../../shared/guide/GuideBuilder';
import ShiftingPowerArcane, { MAX_TICKS, ShiftingPowerCast } from '../analyzers/ShiftingPower';

class ShiftingPowerGuide extends Analyzer {
  static dependencies = {
    shiftingPower: ShiftingPowerArcane,
  };

  protected shiftingPower!: ShiftingPowerArcane;

  get expandableConfig(): ExpandableConfig {
    return createExpandableConfig({
      spell: TALENTS.SHIFTING_POWER_TALENT,
      formatTimestamp: (timestamp: number) => this.owner.formatTimestamp(timestamp),
      getTimestamp: (cast: unknown) => (cast as ShiftingPowerCast).timestamp,
      checklistItems: [
        {
          label: <>Channeled full duration</>,
          getResult: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return spCast.ticks >= MAX_TICKS;
          },
          getDetails: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return `${spCast.ticks}/${MAX_TICKS} ticks`;
          },
        },
        {
          label: (
            <>
              <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} /> on cooldown
            </>
          ),
          getResult: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return spCast.spellsReduced.arcaneSurge;
          },
          getDetails: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return spCast.spellsReduced.arcaneSurge ? 'Being reduced' : 'Not on cooldown';
          },
        },
        {
          label: (
            <>
              <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} /> on cooldown
            </>
          ),
          getResult: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return spCast.spellsReduced.touchOfTheMagi;
          },
          getDetails: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return spCast.spellsReduced.touchOfTheMagi ? 'Being reduced' : 'Not on cooldown';
          },
        },
        {
          label: (
            <>
              <SpellLink spell={TALENTS.EVOCATION_TALENT} /> on cooldown
            </>
          ),
          getResult: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return spCast.spellsReduced.evocation;
          },
          getDetails: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return spCast.spellsReduced.evocation ? 'Being reduced' : 'Not on cooldown';
          },
        },
        {
          label: <>In conserve phase</>,
          getResult: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            return (
              !spCast.cdsActive.arcaneSurge &&
              !spCast.cdsActive.touchOfTheMagi &&
              !spCast.cdsActive.siphonStorm
            );
          },
          getDetails: (cast: unknown) => {
            const spCast = cast as ShiftingPowerCast;
            const activeCds = [];
            if (spCast.cdsActive.arcaneSurge) activeCds.push('Arcane Surge');
            if (spCast.cdsActive.touchOfTheMagi) activeCds.push('Touch of the Magi');
            if (spCast.cdsActive.siphonStorm) activeCds.push('Siphon Storm');
            return activeCds.length > 0 ? `Active: ${activeCds.join(', ')}` : 'Conserve phase';
          },
        },
      ],
    });
  }

  get shiftingPowerData(): BoxRowEntry[] {
    return evaluateEvents(
      this.shiftingPower.casts,
      (cast: ShiftingPowerCast) => {
        const inConservePhase =
          !cast.cdsActive.arcaneSurge &&
          !cast.cdsActive.touchOfTheMagi &&
          !cast.cdsActive.siphonStorm;
        const fullDuration = cast.ticks >= MAX_TICKS;
        const allMajorCdsOnCooldown =
          cast.spellsReduced.arcaneSurge &&
          cast.spellsReduced.touchOfTheMagi &&
          cast.spellsReduced.evocation;

        return {
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
              description:
                'Good - all major cooldowns being reduced (Arcane Surge, Touch, Evocation)',
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
        };
      },
      this,
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

    return new GuideBuilder(TALENTS.SHIFTING_POWER_TALENT, 'Shifting Power')
      .explanation(explanation)
      .when(this.shiftingPower.casts.length > 0, (builder: GuideBuilder) =>
        builder.addExpandableBreakdown({
          castBreakdowns: generateExpandableBreakdown({
            castData: this.shiftingPower.casts,
            evaluatedData: this.shiftingPowerData,
            expandableConfig: this.expandableConfig,
          }),
        }),
      )
      .when(this.shiftingPower.casts.length === 0, (builder: GuideBuilder) => builder.addNoUsage())
      .build();
  }
}

export default ShiftingPowerGuide;
