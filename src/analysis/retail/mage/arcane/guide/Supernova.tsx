import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { evaluateEvents } from '../../shared/components';
import { GuideBuilder } from '../../shared/builders';

const AOE_TARGET_THRESHOLD = 4;
const TOUCH_DURATION_THRESHOLD = 3000;
import { UNERRING_PROFICIENCY_MAX_STACKS } from '../../shared';
import Supernova from '../../shared/Supernova';

class SupernovaGuide extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
    supernova: Supernova,
  };

  protected supernova!: Supernova;

  hasTouchOfTheMagi: boolean = this.selectedCombatant.hasTalent(TALENTS.TOUCH_OF_THE_MAGI_TALENT);
  hasUnerringProficiency: boolean = this.selectedCombatant.hasTalent(
    TALENTS.UNERRING_PROFICIENCY_TALENT,
  );

  get supernovaData(): BoxRowEntry[] {
    return evaluateEvents({
      events: this.supernova.casts,
      analyzer: this,
      evaluationLogic: (cast) => {
        const ST = cast.targetsHit < AOE_TARGET_THRESHOLD;
        const AOE = cast.targetsHit >= AOE_TARGET_THRESHOLD;
        const goodTouchTiming =
          cast.touchRemaining != null && cast.touchRemaining < TOUCH_DURATION_THRESHOLD;
        const maxUnerringStacks = cast.unerringStacks === UNERRING_PROFICIENCY_MAX_STACKS;

        return {
          actionName: 'Supernova',

          failConditions: [
            {
              name: 'touchTimingFail',
              active: this.hasTouchOfTheMagi,
              check:
                ST &&
                cast.touchRemaining != null &&
                cast.touchRemaining >= TOUCH_DURATION_THRESHOLD,
              description: cast.touchRemaining
                ? `${(cast.touchRemaining / 1000).toFixed(1)}s remaining - should wait until Touch is almost expired`
                : '',
            },
            {
              name: 'unerringStacksFail',
              active: this.hasUnerringProficiency,
              check: AOE && cast.unerringStacks !== UNERRING_PROFICIENCY_MAX_STACKS,
              description: cast.unerringStacks
                ? `${cast.unerringStacks} stacks (need ${UNERRING_PROFICIENCY_MAX_STACKS}) - wait for max stacks for AoE`
                : 'Missing Unerring Proficiency buff for AoE',
            },
          ],

          perfectConditions: [
            {
              name: 'perfectSingleTarget',
              active: this.hasTouchOfTheMagi,
              check: ST && goodTouchTiming,
              description: cast.touchRemaining
                ? `Perfect timing - ${(cast.touchRemaining / 1000).toFixed(1)}s Touch remaining`
                : 'Perfect - used at Touch end',
            },
            {
              name: 'perfectAoe',
              active: this.hasUnerringProficiency,
              check: AOE && maxUnerringStacks && cast.targetsHit >= AOE_TARGET_THRESHOLD,
              description: `Perfect AoE - ${UNERRING_PROFICIENCY_MAX_STACKS} Unerring stacks, ${cast.targetsHit} targets hit`,
            },
          ],

          goodConditions: [
            {
              name: 'goodSingleTarget',
              check: ST && (!this.hasTouchOfTheMagi || goodTouchTiming),
              description:
                this.hasTouchOfTheMagi && cast.touchRemaining
                  ? `Good timing - ${(cast.touchRemaining / 1000).toFixed(1)}s Touch remaining`
                  : 'Good single target usage',
            },
            {
              name: 'goodAoe',
              check: AOE && (!this.hasUnerringProficiency || maxUnerringStacks),
              description: this.hasUnerringProficiency
                ? `Good AoE - ${UNERRING_PROFICIENCY_MAX_STACKS} stacks, ${cast.targetsHit} targets`
                : `Good AoE - ${cast.targetsHit} targets hit`,
            },
            {
              name: 'interruptUtility',
              check: cast.targetsHit >= 1,
              description: `Utility usage - ${cast.targetsHit} targets (can interrupt non-boss enemies)`,
            },
          ],

          okConditions: [
            {
              name: 'standardUsage',
              check: true,
              description: `Standard usage - ${cast.targetsHit} targets hit`,
            },
          ],

          defaultPerformance: QualitativePerformance.Ok,
          defaultMessage: `Used on ${cast.targetsHit} targets - check timing for optimization`,
        };
      },
    });
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
              stacks of {unerringProficiency} and {supernova} will hit {AOE_TARGET_THRESHOLD} or
              more targets.
            </li>
          </ul>
        </div>
      </>
    );

    const supernovaTooltip = (
      <>{this.supernova.averageTargetsHit.toFixed(2)} average targets hit per cast.</>
    );

    return new GuideBuilder(TALENTS.SUPERNOVA_TALENT)
      .explanation(explanation)
      .when(this.supernova.casts.length > 0, (builder: GuideBuilder) =>
        builder
          .addStatistic({
            value: this.supernova.averageTargetsHit.toFixed(2),
            label: 'Average Targets Hit',
            performance: QualitativePerformance.Good,
            tooltip: supernovaTooltip,
          })
          .addCastSummary({
            castData: this.supernovaData,
          }),
      )
      .when(this.supernova.casts.length === 0, (builder: GuideBuilder) => builder.addNoUsage())
      .build();
  }
}

export default SupernovaGuide;
