import Analyzer from 'parser/core/Analyzer';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { PerformanceMark } from 'interface/guide';

/**
 * Base class for Mage guide components that provides common functionality
 * used across multiple guide implementations.
 */
abstract class BaseMageGuide extends Analyzer {
  /**
   * Generates a standardized tooltip for guide performance entries.
   * This method is used identically across multiple mage guide components.
   *
   * @param performance - Overall performance level for this entry
   * @param tooltipItems - Array of performance details to display
   * @param timestamp - Timestamp of the event for display
   * @returns JSX tooltip element
   */
  generateGuideTooltip(
    performance: QualitativePerformance,
    tooltipItems: { perf: QualitativePerformance; detail: string }[],
    timestamp: number,
  ): JSX.Element {
    const tooltip = (
      <>
        <div>
          <b>@ {this.owner.formatTimestamp(timestamp)}</b>
        </div>
        <div>
          <PerformanceMark perf={performance} /> {performance}
        </div>
        <div>
          {tooltipItems.map((t, i) => (
            <div key={i}>
              <PerformanceMark perf={t.perf} /> {t.detail}
              <br />
            </div>
          ))}
        </div>
      </>
    );
    return tooltip;
  }

  /**
   * Abstract method that each guide must implement to provide its content.
   * This ensures a consistent interface across all mage guide components.
   */
  abstract get guideSubsection(): JSX.Element;
}

export default BaseMageGuide;