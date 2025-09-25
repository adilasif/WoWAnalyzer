import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BaseMageGuide, MageGuideComponents, createRuleset } from '../../shared/guide';

import Clearcasting from '../core/Clearcasting';

class ClearcastingGuide extends BaseMageGuide {
  static dependencies = {
    clearcasting: Clearcasting,
  };

  protected clearcasting!: Clearcasting;

  get clearcastingData(): BoxRowEntry[] {
    return this.clearcasting.clearcastingProcs.map((cc) => {
      return createRuleset(cc, this)

        // ===== INDIVIDUAL RULE DEFINITIONS =====

        .createRule({
          id: 'notExpired',
          check: () => !cc.expired,
          failureText: 'Clearcasting Expired',
          successText: 'Clearcasting Used Before Expiring',
          failurePerformance: QualitativePerformance.Fail
        })

        // ===== PERFORMANCE CRITERIA =====

        .perfectIf(['notExpired'])  // Perfect if used before expiring

        // If expired, automatic Fail

        .evaluate(cc.applied);
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
            <li>Never let procs expire without getting used, unless you have no choice because of forced downtime.</li>
            <li>Avoid overcapping on procs.</li>
          </ul>
        </div>
      </>
    );

    const dataComponents = [
      MageGuideComponents.createPerCastSummary(
        SPELLS.CLEARCASTING_ARCANE,
        this.clearcastingData,
      ),
    ];

    return MageGuideComponents.createSubsection(
      explanation,
      dataComponents,
      'Clearcasting',
    );
  }
}

export default ClearcastingGuide;
