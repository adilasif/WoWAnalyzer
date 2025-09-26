import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BaseMageGuide, MageGuideComponents, createRuleset } from '../../shared/guide';
import PresenceOfMind, { PresenceOfMindCast } from '../talents/PresenceOfMind';

const TOUCH_DELAY_THRESHOLD = 500;
const AOE_THRESHOLD = 4;

class PresenceOfMindGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    presenceOfMind: PresenceOfMind,
  };

  protected presenceOfMind!: PresenceOfMind;

  private perCastBreakdown(cast: PresenceOfMindCast): React.ReactNode {
    const ST = cast.targets && cast.targets < AOE_THRESHOLD;
    const AOE = cast.targets && cast.targets >= AOE_THRESHOLD;
    const touchAtEnd = cast.usedTouchEnd;
    const aoeCharges = cast.charges === 2 || cast.charges === 3;

    // Create rules for evaluation
    const ruleset = createRuleset(cast, this)
      .createRule({
        id: 'charges',
        check: () => true, // Always show charges as informational
        failureText: `${cast.charges} charges`,
        successText: `${cast.charges} charges`,
        failurePerformance: QualitativePerformance.Good,
        successPerformance: QualitativePerformance.Good,
        label: (
          <>
            <SpellLink spell={SPELLS.ARCANE_CHARGE} />s
          </>
        ),
      })
      .createRule({
        id: 'stacksUsed',
        check: () => true, // Always show stacks used as informational
        failureText: `${cast.stacksUsed} stacks used`,
        successText: `${cast.stacksUsed} stacks used`,
        failurePerformance: QualitativePerformance.Good,
        successPerformance: QualitativePerformance.Good,
        label: <>Stacks Used</>,
      })
      .createRule({
        id: 'targets',
        check: () => true, // Always show targets as informational
        failureText: cast.targets ? `${cast.targets} targets` : 'Unknown targets',
        successText: cast.targets ? `${cast.targets} targets` : 'Unknown targets',
        failurePerformance: QualitativePerformance.Good,
        successPerformance: QualitativePerformance.Good,
        label: <>Targets Hit (Next Barrage)</>,
      })
      .createRule({
        id: 'touchTiming',
        check: () => !ST || Boolean(touchAtEnd),
        failureText: 'Not used at Touch end',
        successText: 'Used at Touch end',
        active: () => Boolean(ST),
        label: (
          <>
            Used at end of <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />
          </>
        ),
      })
      .createRule({
        id: 'touchDelay',
        check: () => !cast.touchCancelDelay || cast.touchCancelDelay <= TOUCH_DELAY_THRESHOLD,
        failureText: cast.touchCancelDelay ? `${cast.touchCancelDelay.toFixed(2)}ms delay` : '',
        successText: cast.touchCancelDelay
          ? `${cast.touchCancelDelay.toFixed(2)}ms delay`
          : 'No delay',
        active: () => cast.touchCancelDelay != null,
        label: <>Channel Clipped Before/After GCD</>,
      })
      .createRule({
        id: 'aoeCharges',
        check: () => !AOE || aoeCharges,
        failureText: `${cast.charges} charges (should be 2-3)`,
        successText: `${cast.charges} charges`,
        active: () => Boolean(AOE),
        label: <>Good charge count for AoE</>,
      })
      .goodIf(['charges', 'stacksUsed', 'targets', 'touchTiming', 'touchDelay', 'aoeCharges']);

    // Get rule results and performance
    const ruleResults = ruleset.getRuleResults();
    const performance = ruleset.getPerformance();

    return MageGuideComponents.createExpandableCastItem(
      TALENTS.PRESENCE_OF_MIND_TALENT,
      cast.cast.timestamp,
      this.owner,
      ruleResults,
      performance,
      cast.ordinal,
    );
  }

  get guideSubsection(): JSX.Element {
    const presenceOfMind = <SpellLink spell={TALENTS.PRESENCE_OF_MIND_TALENT} />;
    const arcaneBlast = <SpellLink spell={SPELLS.ARCANE_BLAST} />;
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;

    const explanation = (
      <>
        <div>
          <b>{presenceOfMind}</b> is a simple ability whos primary benefit is squeezing a couple
          extra casts into a tight buff window or getting to a harder hitting ability faster. So
          while it itself is not a major damage ability, it can help you get a little bit more out
          of your other abilities. Use the below guidelines to add these benefits to your rotation.
          <ul>
            <li>
              In Single Target, you should use {presenceOfMind} to squeeze a couple extra casts into
              the final couple seconds of {touchOfTheMagi}
            </li>
            <li>
              If you are unable to finish both {arcaneBlast} casts before {touchOfTheMagi} ends,
              cancel the {presenceOfMind} buff so it's cooldown stays in sync with {touchOfTheMagi}
            </li>
            <li>
              In AOE, you can use {presenceOfMind} at 2 or 3 {arcaneCharge}s to get to{' '}
              {arcaneBarrage} (with 4 {arcaneCharge}s) faster.
            </li>
          </ul>
        </div>
      </>
    );

    const castBreakdowns = this.presenceOfMind.pomCasts.map((cast) => this.perCastBreakdown(cast));

    const dataComponents =
      this.presenceOfMind.pomCasts.length > 0
        ? [MageGuideComponents.createExpandableCastBreakdown(castBreakdowns)]
        : [MageGuideComponents.createNoUsageComponent(TALENTS.PRESENCE_OF_MIND_TALENT)];

    return MageGuideComponents.createSubsection(explanation, dataComponents, 'Presence of Mind');
  }
}

export default PresenceOfMindGuide;
