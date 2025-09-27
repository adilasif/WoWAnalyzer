import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { SpellSeq } from 'parser/ui/SpellSeq';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { BaseMageGuide, GuideComponents, evaluateGuide } from '../../shared/guide';

import TouchOfTheMagi from '../talents/TouchOfTheMagi';

const MAX_ARCANE_CHARGES = 4;

class TouchOfTheMagiGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    touchOfTheMagi: TouchOfTheMagi,
  };

  protected touchOfTheMagi!: TouchOfTheMagi;

  activeTimeUtil(activePercent: number) {
    const thresholds = this.touchOfTheMagi.touchMagiActiveTimeThresholds.isLessThan;
    let performance = QualitativePerformance.Good;
    if (activePercent >= thresholds.minor) {
      performance = QualitativePerformance.Perfect;
    } else if (activePercent >= thresholds.average) {
      performance = QualitativePerformance.Good;
    } else if (activePercent >= thresholds.major) {
      performance = QualitativePerformance.Ok;
    }
    return performance;
  }

  get touchOfTheMagiData(): BoxRowEntry[] {
    return this.touchOfTheMagi.touchCasts.map((cast) => {
      const noCharges = cast.charges === 0;
      const maxCharges = cast.charges === MAX_ARCANE_CHARGES;
      const activeTime = cast.activeTime || 0;
      const activeTimePerf = this.activeTimeUtil(activeTime) as QualitativePerformance;
      const correctCharges = noCharges || (maxCharges && cast.refundBuff);

      return evaluateGuide(cast.applied, cast, this, {
        actionName: 'Touch of the Magi',

        // FAIL: Critical mistakes
        failConditions: [
          {
            name: 'wrongCharges',
            check: !correctCharges,
            description: `Wrong charge count (${cast.charges}) - should have 0 or 4 charges with refund buff`,
          },
          {
            name: 'veryLowActiveTime',
            check: activeTimePerf === QualitativePerformance.Fail,
            description: `Very low active time (${formatPercentage(activeTime, 1)}%) - need to cast more during Touch window`,
          },
        ],

        // PERFECT: Optimal usage
        perfectConditions: [
          {
            name: 'perfectActiveTime',
            check: correctCharges && activeTimePerf === QualitativePerformance.Perfect,
            description: `Perfect usage: correct charges (${cast.charges}) + excellent active time (${formatPercentage(activeTime, 1)}%)`,
          },
        ],

        // GOOD: Acceptable usage
        goodConditions: [
          {
            name: 'goodActiveTime',
            check: correctCharges && activeTimePerf === QualitativePerformance.Good,
            description: `Good usage: correct charges (${cast.charges}) + good active time (${formatPercentage(activeTime, 1)}%)`,
          },
        ],

        // OK: Basic acceptable usage
        okConditions: [
          {
            name: 'correctChargesOk',
            check: correctCharges && activeTimePerf === QualitativePerformance.Ok,
            description: `Acceptable: correct charges (${cast.charges}) but could improve active time (${formatPercentage(activeTime, 1)}%)`,
          },
        ],

        defaultPerformance: QualitativePerformance.Fail,
        defaultMessage: `Suboptimal Touch usage: ${cast.charges} charges, ${formatPercentage(activeTime, 1)}% active time`,
      });
    });
  }

  get guideSubsection(): JSX.Element {
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;
    const siphonStorm = <SpellLink spell={SPELLS.SIPHON_STORM_BUFF} />;
    const netherPrecision = <SpellLink spell={TALENTS.NETHER_PRECISION_TALENT} />;
    const evocation = <SpellLink spell={TALENTS.EVOCATION_TALENT} />;
    const arcaneBlast = <SpellLink spell={SPELLS.ARCANE_BLAST} />;
    const arcaneSurge = <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} />;
    const presenceOfMind = <SpellLink spell={TALENTS.PRESENCE_OF_MIND_TALENT} />;
    const burdenOfPower = <SpellLink spell={TALENTS.BURDEN_OF_POWER_TALENT} />;
    const gloriousIncandescence = <SpellLink spell={TALENTS.GLORIOUS_INCANDESCENCE_TALENT} />;
    const intuition = <SpellLink spell={SPELLS.INTUITION_BUFF} />;

    const explanation = (
      <>
        <div>
          <b>{touchOfTheMagi}</b> is a short debuff available for each burn phase and grants you 4{' '}
          {arcaneCharge}s and accumulates 20% of your damage for the duration. When the debuff
          expires it explodes dealing damage to the target and reduced damage to nearby targets.
        </div>
        <div>
          <ul>
            <li>
              Using the standard rotation, cast as many spells as possible at the debuffed target
              until the debuff expires.
            </li>
            <li>
              Spend your {arcaneCharge}s with {arcaneBarrage} and then cast {touchOfTheMagi} while{' '}
              {arcaneBarrage}
              is in the air for some extra damage. cast
              {touchOfTheMagi} while {arcaneBarrage} is in the air. This should be done even if your
              charges will be refunded anyway via {burdenOfPower}, {gloriousIncandescence}, or{' '}
              {intuition}.
            </li>
            <li>
              Major Burn Phase: Ensure you have {siphonStorm} and {netherPrecision}. Your cast
              sequence would typically be{' '}
              <SpellSeq
                spells={[
                  TALENTS.EVOCATION_TALENT,
                  TALENTS.ARCANE_MISSILES_TALENT,
                  TALENTS.ARCANE_SURGE_TALENT,
                  SPELLS.ARCANE_BARRAGE,
                  TALENTS.TOUCH_OF_THE_MAGI_TALENT,
                ]}
              />
              . If you don't have 4 {arcaneCharge}s, cast {arcaneOrb} before {arcaneSurge}.
            </li>
            <li>
              Minor Burn Phase: {evocation} and {arcaneSurge} will not be available, but if possible
              you should go into {touchOfTheMagi} with {netherPrecision}.
            </li>
            <li>
              Use {presenceOfMind} at the end of {touchOfTheMagi} to squeeze in a couple more{' '}
              {arcaneBlast} casts.
            </li>
          </ul>
        </div>
      </>
    );
    const activeTimeTooltip = (
      <>
        {formatPercentage(this.touchOfTheMagi.averageActiveTime)}% average Active Time per Touch of
        the Magi cast.
      </>
    );

    const dataComponents = [
      GuideComponents.createStatisticPanel(
        TALENTS.TOUCH_OF_THE_MAGI_TALENT,
        `${formatPercentage(this.touchOfTheMagi.averageActiveTime)}%`,
        'Average Active Time',
        this.activeTimeUtil(this.touchOfTheMagi.averageActiveTime),
        activeTimeTooltip,
      ),
      GuideComponents.createPerCastSummary(
        TALENTS.TOUCH_OF_THE_MAGI_TALENT,
        this.touchOfTheMagiData,
      ),
    ];

    return GuideComponents.createSubsection(explanation, dataComponents, 'Touch of the Magi');
  }
}

export default TouchOfTheMagiGuide;
