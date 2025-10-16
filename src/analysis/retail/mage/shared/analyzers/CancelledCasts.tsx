import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { Options } from 'parser/core/Analyzer';
import CoreCancelledCasts from 'parser/shared/modules/CancelledCasts';
import { MageStatistic } from '../components/statistics';

class CancelledCasts extends CoreCancelledCasts {
  constructor(options: Options) {
    super(options);
    this.IGNORED_ABILITIES = [
      SPELLS.FIRE_BLAST.id,
      TALENTS.COMBUSTION_TALENT.id,
      TALENTS.SHIMMER_TALENT.id,
    ];
  }

  get cancelledPercentage() {
    return this.castsCancelled / this.totalCasts;
  }

  statistic() {
    return (
      <MageStatistic
        spell={SPELLS.FIRE_BLAST}
        values={[
          { value: this.cancelledPercentage, label: 'Cancelled Casts', format: 'percentage' },
        ]}
        tooltip={<span>Percentage of casts cancelled (excluding ignored abilities).</span>}
      />
    );
  }
}

export default CancelledCasts;
