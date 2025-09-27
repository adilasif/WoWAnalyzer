import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BaseMageGuide, evaluateEvents } from '../../shared/guide';
import { GuideBuilder } from '../../shared/guide/GuideBuilder';

import Clearcasting, { ClearcastingProc } from '../core/Clearcasting';

class ClearcastingGuide extends BaseMageGuide {
  static dependencies = {
    ...BaseMageGuide.dependencies,
    clearcasting: Clearcasting,
  };

  protected clearcasting!: Clearcasting;

  get clearcastingData(): BoxRowEntry[] {
    return evaluateEvents(
      this.clearcasting.clearcastingProcs,
      (cc: ClearcastingProc) => ({
        actionName: 'Clearcasting',

        // FAIL: Letting procs expire
        failConditions: [
          {
            name: 'expired',
            check: cc.expired,
            description: 'Expired unused - significant DPS loss',
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
      }),
      this,
    );
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

    return new GuideBuilder(SPELLS.CLEARCASTING_ARCANE, 'Clearcasting')
      .explanation(explanation)
      .addCastSummary({
        castData: this.clearcastingData,
      })
      .build();
  }
}

export default ClearcastingGuide;
