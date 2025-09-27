import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BaseMageGuide, GuideComponents, evaluateGuide } from '../../shared/guide';

import Clearcasting from '../core/Clearcasting';

class ClearcastingGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    clearcasting: Clearcasting,
  };

  protected clearcasting!: Clearcasting;

  get clearcastingData(): BoxRowEntry[] {
    return this.clearcasting.clearcastingProcs.map((cc) => {
      return evaluateGuide(cc.applied, cc, this, {
        actionName: 'Clearcasting',

        // FAIL: Letting procs expire
        failConditions: [
          {
            name: 'expired',
            check: cc.expired,
            description: 'Clearcasting proc expired unused - significant DPS loss',
          },
        ],

        // PERFECT: Used before expiring
        perfectConditions: [
          {
            name: 'usedBeforeExpiry',
            check: !cc.expired,
            description: 'Perfect - used Clearcasting proc before it expired',
          },
        ],

        defaultPerformance: QualitativePerformance.Fail,
        defaultMessage: 'Clearcasting proc not handled properly',
      });
    });
  }

  get guideSubsection(): JSX.Element {
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;

    const explanation = (
      <>
        <div>
          Ensure you are spending your <b>{clearcasting}</b> procs effectively with {clearcasting}.
        </div>
        <div>
          <ul>
            <li>
              Never let procs expire without getting used, unless you have no choice because of
              forced downtime.
            </li>
            <li>Avoid overcapping on procs.</li>
          </ul>
        </div>
      </>
    );

    const dataComponents = [
      GuideComponents.createPerCastSummary(SPELLS.CLEARCASTING_ARCANE, this.clearcastingData),
    ];

    return GuideComponents.createSubsection(explanation, dataComponents, 'Clearcasting');
  }
}

export default ClearcastingGuide;
