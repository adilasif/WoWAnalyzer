import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import TALENTS from 'common/TALENTS/evoker';
import SPELLS from 'common/SPELLS/evoker';
import Events, { DamageEvent } from 'parser/core/Events';
import { SHATTERING_STARS_MULTIPLIER_PER_RANK, STAR_SALVO_MULTIPLIER } from '../../constants';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import DonutChart from 'parser/ui/DonutChart';
import { getEmpowerCastEvent } from 'analysis/retail/evoker/shared/modules/normalizers/EmpowerNormalizer';
import { calculateEffectiveDamage } from 'parser/core/EventCalculateLib';
import { formatNumber } from 'common/format';
import TalentSpellText from 'parser/ui/TalentSpellText';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import { encodeEventTargetString } from 'parser/shared/modules/Enemies';
import { getEternitySurgeEventForShatteringStarDamage } from '../normalizers/CastLinkNormalizer';
import SpellLink from 'interface/SpellLink';
import { BadColor } from 'interface/guide';

const SCINTILLATION_BUFFER_MS = 200;

/**
 * Shattering Stars
 * Eternity Surge additionally releases a Shattering Star at your target
 * that deals 50% more damage per empower level reached.
 *
 *
 * Star Salvo
 * Increases Shattering Star damage by 35%.
 * Shattering Stars are exhaled at all of your Eternity Surge targets.
 */
class ShatteringStars extends Analyzer {
  baseDamage = 0;
  empowermentLevelDamage = 0;

  scintillationExtraHitsDamage = 0;

  starSalvoExtraHitsDamage = 0;
  starSalvoAmpedDamage = 0;

  hasStarSalvo = this.selectedCombatant.hasTalent(TALENTS.STAR_SALVO_TALENT);
  hasSpan = this.selectedCombatant.hasTalent(TALENTS.ETERNITYS_SPAN_TALENT);

  lastScintillationEvent: DamageEvent | undefined;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.SHATTERING_STARS_TALENT);

    if (this.selectedCombatant.hasTalent(TALENTS.STAR_SALVO_TALENT)) {
      this.addEventListener(
        Events.damage.by(SELECTED_PLAYER).spell(SPELLS.SHATTERING_STAR_DAMAGE),
        this.onStarSalvoDamage,
      );
    } else {
      this.addEventListener(
        Events.damage.by(SELECTED_PLAYER).spell(SPELLS.SHATTERING_STAR_DAMAGE),
        this.onDamage,
      );
    }
  }

  private onStarSalvoDamage(event: DamageEvent) {
    const empowerEndEvent = getEternitySurgeEventForShatteringStarDamage(event);
    let baseAmount = event.amount + (event.absorbed || 0);

    const starSalvoAmpedDamage = calculateEffectiveDamage(event, STAR_SALVO_MULTIPLIER);
    this.starSalvoAmpedDamage += starSalvoAmpedDamage;

    baseAmount -= starSalvoAmpedDamage;

    // No Empower End event means that this is triggered by Scintillation
    if (!empowerEndEvent) {
      if (!this.hasSpan) {
        this.scintillationExtraHitsDamage += baseAmount;
        return;
      }

      if (
        this.lastScintillationEvent &&
        encodeEventTargetString(event) !== encodeEventTargetString(this.lastScintillationEvent) &&
        event.timestamp - this.lastScintillationEvent.timestamp < SCINTILLATION_BUFFER_MS
      ) {
        this.starSalvoExtraHitsDamage += baseAmount;
        return;
      }

      this.lastScintillationEvent = event;
      this.scintillationExtraHitsDamage += baseAmount;
      return;
    }

    const uprankedDamage = this.getUprankedDamage(event, empowerEndEvent.empowermentLevel);
    this.empowermentLevelDamage += uprankedDamage;

    baseAmount -= uprankedDamage;

    const empowerCastEvent = getEmpowerCastEvent(empowerEndEvent);

    if (!empowerCastEvent) {
      this.addDebugAnnotation(empowerEndEvent, {
        color: BadColor,
        summary: 'Unable to find cast event for Empower end event',
      });
    }

    if (
      !empowerCastEvent ||
      encodeEventTargetString(event) === encodeEventTargetString(empowerCastEvent)
    ) {
      this.baseDamage += baseAmount;
    } else {
      this.starSalvoExtraHitsDamage += baseAmount;
    }
  }

  private onDamage(event: DamageEvent) {
    const empowerEndEvent = getEternitySurgeEventForShatteringStarDamage(event);
    let baseAmount = event.amount + (event.absorbed || 0);

    // No Empower End event means that this is triggered by Scintillation
    if (!empowerEndEvent) {
      this.scintillationExtraHitsDamage += baseAmount;
      return;
    }

    const uprankedDamage = this.getUprankedDamage(event, empowerEndEvent.empowermentLevel);

    this.baseDamage += baseAmount - uprankedDamage;
    this.empowermentLevelDamage += uprankedDamage;
  }

  private getUprankedDamage(event: DamageEvent, empowerLevel: number) {
    const amountOfUprank = empowerLevel - 1;
    if (amountOfUprank === 0) {
      return 0;
    }

    return calculateEffectiveDamage(event, SHATTERING_STARS_MULTIPLIER_PER_RANK * amountOfUprank);
  }

  statistic() {
    const shatteringStarsItems = [
      {
        color: 'rgb(123,188,93)',
        label: <SpellLink spell={TALENTS.ETERNITY_SURGE_TALENT} />,
        valueTooltip: formatNumber(this.baseDamage),
        value: this.baseDamage,
      },
      {
        color: 'rgb(41,134,204)',
        label: 'Empowerment amp',
        valueTooltip: formatNumber(this.empowermentLevelDamage),
        value: this.empowermentLevelDamage,
      },
      {
        color: 'rgb(183,65,14)',
        label: <SpellLink spell={TALENTS.SCINTILLATION_TALENT} />,
        valueTooltip: formatNumber(this.scintillationExtraHitsDamage),
        value: this.scintillationExtraHitsDamage,
      },
    ].sort((a, b) => b.value - a.value);

    const totalDamageShatteringStarsDamage =
      this.baseDamage + this.empowermentLevelDamage + this.scintillationExtraHitsDamage;

    const starSalvoItems = [
      {
        color: 'rgb(123,188,93)',
        label: 'Extra hits',
        valueTooltip: formatNumber(this.starSalvoExtraHitsDamage),
        value: this.starSalvoExtraHitsDamage,
      },
      {
        color: 'rgb(41,134,204)',
        label: 'Damage amp',
        valueTooltip: formatNumber(this.starSalvoAmpedDamage),
        value: this.starSalvoAmpedDamage,
      },
    ].sort((a, b) => b.value - a.value);

    const totalDamageStarSalvoDamage = this.starSalvoExtraHitsDamage + this.starSalvoAmpedDamage;

    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL()}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            <li>
              <SpellLink spell={TALENTS.SHATTERING_STARS_TALENT} /> damage:{' '}
              {formatNumber(totalDamageShatteringStarsDamage)}
            </li>
            {this.hasStarSalvo && (
              <li>
                <SpellLink spell={TALENTS.STAR_SALVO_TALENT} /> damage:{' '}
                {formatNumber(totalDamageStarSalvoDamage)}
              </li>
            )}
          </>
        }
      >
        <TalentSpellText talent={TALENTS.SHATTERING_STARS_TALENT}>
          <ItemDamageDone amount={totalDamageShatteringStarsDamage} />
        </TalentSpellText>
        <div className="pad">
          <label>Damage sources</label>
          <DonutChart items={shatteringStarsItems} />
        </div>
        {this.hasStarSalvo && (
          <>
            <TalentSpellText talent={TALENTS.STAR_SALVO_TALENT}>
              <ItemDamageDone amount={totalDamageStarSalvoDamage} />
            </TalentSpellText>
            <div className="pad">
              <label>Damage sources</label>
              <DonutChart items={starSalvoItems} />
            </div>
          </>
        )}
      </Statistic>
    );
  }
}

export default ShatteringStars;
