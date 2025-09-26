import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BaseMageGuide, MageGuideComponents, createRuleset } from '../../shared/guide';
import { UNERRING_PROFICIENCY_MAX_STACKS } from '../../shared';
import Supernova, { SupernovaCast } from '../../shared/Supernova';

const AOE_THRESHOLD = 4;
const TOUCH_DURATION_THRESHOLD = 3000;

class SupernovaGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    supernova: Supernova,
  };

  protected supernova!: Supernova;

  hasTouchOfTheMagi: boolean = this.selectedCombatant.hasTalent(TALENTS.TOUCH_OF_THE_MAGI_TALENT);
  hasUnerringProficiency: boolean = this.selectedCombatant.hasTalent(
    TALENTS.UNERRING_PROFICIENCY_TALENT,
  );

  private perCastBreakdown(cast: SupernovaCast): React.ReactNode {
    const ST = cast.targetsHit < AOE_THRESHOLD;
    const AOE = cast.targetsHit >= AOE_THRESHOLD;

    // Create rules for evaluation
    const ruleset = createRuleset(cast, this)
      .createRule({
        id: 'touchTiming',
        check: () =>
          !this.hasTouchOfTheMagi ||
          (cast.touchRemaining != null && cast.touchRemaining < TOUCH_DURATION_THRESHOLD),
        failureText: cast.touchRemaining
          ? `${(cast.touchRemaining / 1000).toFixed(1)}s remaining`
          : 'No Touch active',
        successText: cast.touchRemaining
          ? `${(cast.touchRemaining / 1000).toFixed(1)}s remaining`
          : 'No Touch needed',
        active: () => this.hasTouchOfTheMagi && ST,
        label: (
          <>
            <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} /> Duration Remaining
          </>
        ),
      })
      .createRule({
        id: 'unerringStacks',
        check: () =>
          !this.hasUnerringProficiency || cast.unerringStacks === UNERRING_PROFICIENCY_MAX_STACKS,
        failureText: cast.unerringStacks ? `${cast.unerringStacks} stacks` : 'Buff Missing',
        successText: `${UNERRING_PROFICIENCY_MAX_STACKS} stacks`,
        active: () => this.hasUnerringProficiency && AOE,
        label: (
          <>
            <SpellLink spell={TALENTS.UNERRING_PROFICIENCY_TALENT} /> Stacks
          </>
        ),
      })
      .createRule({
        id: 'targetsHit',
        check: () => true, // Always show targets hit as informational
        failureText: `${cast.targetsHit} targets`,
        successText: `${cast.targetsHit} targets`,
        failurePerformance: QualitativePerformance.Good, // Neutral display
        successPerformance: QualitativePerformance.Good,
        label: <>Targets Hit</>,
      })
      .goodIf(['touchTiming', 'unerringStacks', 'targetsHit']);

    // Get rule results and performance
    const ruleResults = ruleset.getRuleResults();
    const performance = ruleset.getPerformance();

    return MageGuideComponents.createExpandableCastItem(
      TALENTS.SUPERNOVA_TALENT,
      cast.timestamp,
      this.owner,
      ruleResults,
      performance,
      cast.ordinal,
    );
  }

  get guideSubsection(): JSX.Element {
    const supernova = <SpellLink spell={TALENTS.SUPERNOVA_TALENT} />;
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const unerringProficiency = <SpellLink spell={TALENTS.UNERRING_PROFICIENCY_TALENT} />;

    const explanation = (
      <>
        <div>
          When used in some specific niche circumstances <b>{supernova}</b> does provide a benefit
          to your overall damage, but can also be used as a way to interrupt non-boss enemies by
          forcing them up into the air, making it very valuable in dungeons especially. For raid
          encounters, and boss fights, refer to the guidelines below to get the most damage out of
          the ability.
          <ul>
            <li>
              On Single Target, {supernova} can be used right at the end of {touchOfTheMagi} to get
              some extra damage in before the debuff expires.
            </li>
            <li>
              For Spellslingers, use {supernova} when you have {UNERRING_PROFICIENCY_MAX_STACKS}{' '}
              stacks of {unerringProficiency} and {supernova} will hit {AOE_THRESHOLD} or more
              targets.
            </li>
          </ul>
        </div>
      </>
    );

    const supernovaTooltip = (
      <>{this.supernova.averageTargetsHit.toFixed(2)} average targets hit per cast.</>
    );

    const castBreakdowns = this.supernova.casts.map((cast) => this.perCastBreakdown(cast));

    const dataComponents =
      this.supernova.casts.length > 0
        ? [
            MageGuideComponents.createStatisticPanel(
              TALENTS.SUPERNOVA_TALENT,
              this.supernova.averageTargetsHit.toFixed(2),
              'Average Targets Hit',
              QualitativePerformance.Good,
              supernovaTooltip,
            ),
            MageGuideComponents.createExpandableCastBreakdown(castBreakdowns),
          ]
        : [MageGuideComponents.createNoUsageComponent(TALENTS.SUPERNOVA_TALENT)];

    return MageGuideComponents.createSubsection(explanation, dataComponents, 'Supernova');
  }
}

export default SupernovaGuide;
