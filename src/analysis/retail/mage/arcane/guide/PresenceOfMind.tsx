import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import MageAnalyzer from '../../shared/MageAnalyzer';
import {
  evaluateEvents,
  MageGuideSection,
  CastSummary,
  NoCastsMessage,
} from '../../shared/components';

const AOE_TARGET_THRESHOLD = 4;
const CAST_DELAY_THRESHOLD = 500; // 500ms
import PresenceOfMind from '../analyzers/PresenceOfMind';

class PresenceOfMindGuide extends MageAnalyzer {
  static dependencies = { ...MageAnalyzer.dependencies, presenceOfMind: PresenceOfMind };

  protected presenceOfMind!: PresenceOfMind;

  get presenceOfMindData(): BoxRowEntry[] {
    return evaluateEvents({
      events: this.presenceOfMind.pomData,
      formatTimestamp: this.owner.formatTimestamp.bind(this.owner),
      evaluationLogic: (cast) => {
        const ST = cast.targets && cast.targets < AOE_TARGET_THRESHOLD;
        const AOE = cast.targets && cast.targets >= AOE_TARGET_THRESHOLD;
        const touchAtEnd = cast.usedTouchEnd;
        const aoeCharges = cast.charges === 2 || cast.charges === 3;
        const hasDelayIssue = cast.touchCancelDelay && cast.touchCancelDelay > CAST_DELAY_THRESHOLD;

        return {
          actionName: 'Presence of Mind',

          failConditions: [
            {
              name: 'touchTimingFail',
              check: Boolean(ST) && !touchAtEnd,
              description:
                'Not used at Touch end - should squeeze extra casts into Touch of the Magi window',
            },
            {
              name: 'aoeChargesFail',
              check: Boolean(AOE) && !aoeCharges,
              description: `${cast.charges} charges (should be 2-3 for AoE) - use at proper charge count for faster Barrage"`,
            },
            {
              name: 'touchDelayFail',
              check: Boolean(hasDelayIssue),
              description: cast.touchCancelDelay
                ? `${cast.touchCancelDelay.toFixed(2)}ms delay - significant clipping issue`
                : '',
            },
          ],

          perfectConditions: [
            {
              name: 'perfectSingleTarget',
              check:
                Boolean(ST) &&
                Boolean(touchAtEnd) &&
                (!cast.touchCancelDelay || cast.touchCancelDelay <= CAST_DELAY_THRESHOLD),
              description: 'Perfect - used at Touch end with proper timing',
            },
            {
              name: 'perfectAoe',
              check: Boolean(AOE) && aoeCharges,
              description: `Perfect - ${cast.charges} charges for AoE (optimal for faster Barrage)"`,
            },
          ],

          goodConditions: [
            {
              name: 'goodSingleTarget',
              check: Boolean(ST) && Boolean(touchAtEnd),
              description: 'Good - used at Touch end to squeeze extra casts',
            },
            {
              name: 'goodAoe',
              check: Boolean(AOE) && aoeCharges,
              description: `Good - ${cast.charges} charges for AoE usage"`,
            },
            {
              name: 'goodTiming',
              check: !cast.touchCancelDelay || cast.touchCancelDelay <= CAST_DELAY_THRESHOLD,
              description: cast.touchCancelDelay
                ? `${cast.touchCancelDelay.toFixed(2)}ms delay - acceptable timing`
                : 'Good timing',
            },
          ],

          okConditions: [
            {
              name: 'informationalUsage',
              check: true,
              description: `Used with ${cast.charges} charges, ${cast.stacksUsed} stacks, ${cast.targets ? cast.targets : 'unknown'} targets hit by next Barrage`,
            },
          ],

          defaultPerformance: QualitativePerformance.Ok,
          defaultMessage: `Standard usage - ${cast.charges} charges, ${cast.stacksUsed} stacks used`,
        };
      },
    });
  }

  get guideSubsection(): JSX.Element {
    const presenceOfMind = <SpellLink spell={TALENTS.PRESENCE_OF_MIND_TALENT} />;
    const arcaneBlast = <SpellLink spell={SPELLS.ARCANE_BLAST} />;
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;

    const explanation = (
      <>
        <b>{presenceOfMind}</b> is a simple ability whos primary benefit is squeezing a couple extra
        casts into a tight buff window or getting to a harder hitting ability faster. So while it
        itself is not a major damage ability, it can help you get a little bit more out of your
        other abilities. Use the below guidelines to add these benefits to your rotation.
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
            In AOE, you can use {presenceOfMind} at 2 or 3 {arcaneCharge}s to get to {arcaneBarrage}{' '}
            (with 4 {arcaneCharge}s) faster.
          </li>
        </ul>
      </>
    );

    return (
      <MageGuideSection spell={TALENTS.PRESENCE_OF_MIND_TALENT} explanation={explanation}>
        {this.presenceOfMind.pomData.length === 0 ? (
          <NoCastsMessage spell={TALENTS.PRESENCE_OF_MIND_TALENT} />
        ) : (
          <CastSummary
            spell={TALENTS.PRESENCE_OF_MIND_TALENT}
            castEntries={this.presenceOfMindData}
            showBreakdown
          />
        )}
      </MageGuideSection>
    );
  }
}

export default PresenceOfMindGuide;
