import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import Analyzer from 'parser/core/Analyzer';
import { MageGuideSection, CastSummary, type CastEvaluation } from '../../shared/components';

import Clearcasting, { ClearcastingData } from '../analyzers/Clearcasting';

class ClearcastingGuide extends Analyzer {
  static dependencies = { 
    clearcasting: Clearcasting 
  };

  protected clearcasting!: Clearcasting;

  /**
   * Evaluates a single Clearcasting proc for CastSummary.
   * Returns performance and reason for tooltip display.
   *
   * Evaluation priority: fail → perfect → default
   */
  private evaluateClearcastingProc(cc: ClearcastingData): CastEvaluation {
    // Fail conditions (highest priority)
    if (cc.expired) {
      return {
        timestamp: cc.applied,
        performance: QualitativePerformance.Fail,
        reason: 'Expired unused - significant DPS loss',
      };
    }

    // Perfect conditions
    if (!cc.expired) {
      return {
        timestamp: cc.applied,
        performance: QualitativePerformance.Perfect,
        reason: 'Perfect - used Clearcasting proc before it expired',
      };
    }

    // Default
    return {
      timestamp: cc.applied,
      performance: QualitativePerformance.Fail,
      reason: 'Clearcasting proc not handled properly',
    };
  }

  get guideSubsection(): JSX.Element {
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;

    const explanation = (
      <>
        Ensure you are spending your <b>{clearcasting}</b> procs effectively with {clearcasting}.
        <ul>
          <li>
            Never let procs expire without getting used, unless you have no choice because of forced
            downtime.
          </li>
          <li>Avoid overcapping on procs.</li>
        </ul>
      </>
    );

    return (
      <MageGuideSection spell={SPELLS.CLEARCASTING_ARCANE} explanation={explanation}>
        <CastSummary
          spell={SPELLS.CLEARCASTING_ARCANE}
          casts={this.clearcasting.clearcastingProcs.map((proc) =>
            this.evaluateClearcastingProc(proc),
          )}
          formatTimestamp={this.owner.formatTimestamp.bind(this.owner)}
          showBreakdown
        />
      </MageGuideSection>
    );
  }
}

export default ClearcastingGuide;
