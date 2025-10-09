import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { Options } from 'parser/core/Analyzer';
import CoreCancelledCasts from 'parser/shared/modules/CancelledCasts';

class CancelledCasts extends CoreCancelledCasts {
  constructor(options: Options) {
    super(options);
    this.IGNORED_ABILITIES = [
      //Include the spells that you do not want to be tracked and spells that are castable while casting (Like Fire Blast, Combustion, or Shimmer)
      SPELLS.FIRE_BLAST.id,
      TALENTS.COMBUSTION_TALENT.id,
      TALENTS.SHIMMER_TALENT.id,
    ];
  }

  get cancelledPercentage() {
    return this.castsCancelled / this.totalCasts;
  }
}

export default CancelledCasts;
