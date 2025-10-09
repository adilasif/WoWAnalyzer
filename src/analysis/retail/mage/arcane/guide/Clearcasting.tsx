import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { evaluateEvents } from '../../shared/components';
import { GuideBuilder } from '../../shared/builders';

import Clearcasting, { ClearcastingData } from '../analyzers/Clearcasting';

class ClearcastingGuide extends MageAnalyzer {
  static dependencies = { ...MageAnalyzer.dependencies, clearcasting: Clearcasting };

  protected clearcasting!: Clearcasting;

  get clearcastingData(): BoxRowEntry[] {
    return evaluateEvents({
      events: this.clearcasting.clearcastingProcs,
      formatTimestamp: this.owner.formatTimestamp.bind(this.owner),
      evaluationLogic: (cc: ClearcastingData) => ({
        actionName: 'Clearcasting',

        failConditions: [
          {
            name: 'expired',
            check: cc.expired,
            description: 'Expired unused - significant DPS loss',
          },
        ],

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

    return new GuideBuilder(SPELLS.CLEARCASTING_ARCANE)
      .explanation(explanation)
      .addCastSummary({
        castData: this.clearcastingData,
      })
      .build();
  }
}

export default ClearcastingGuide;
