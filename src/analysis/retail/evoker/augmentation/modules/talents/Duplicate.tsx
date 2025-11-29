import Analyzer, { Options, SELECTED_PLAYER, SELECTED_PLAYER_PET } from 'parser/core/Analyzer';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_EVOKER } from 'common/TALENTS';
import TalentSpellText from 'parser/ui/TalentSpellText';
import SPELLS from 'common/SPELLS';
import { InformationIcon } from 'interface/icons';
import { formatPercentage } from 'common/format';
import {
  DUPLICATE_EBON_MIGHT_MULTIPLIER,
  DUPLICATE_PERSONAL_DAMAGE_MULTIPLIER,
  EBON_MIGHT_PERSONAL_DAMAGE_AMP,
} from '../../constants';
import Events, { DamageEvent, EmpowerEndEvent, GetRelatedEvents } from 'parser/core/Events';
import TALENTS from 'common/TALENTS/evoker';
import { calculateEffectiveDamage } from 'parser/core/EventCalculateLib';
import DonutChart from 'parser/ui/DonutChart';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import { formatNumber } from 'common/format';
import { UPHEAVAL_REVERBERATION_DAM_LINK } from '../normalizers/CastLinkNormalizer';
/**
 * R1: Deep Breath / Breath of Eons summons Future Self for 20 sec, which will cast Eruption frequently and occasionally empower spells.
 * R2/R3: Sands of Time also extends the duration of Duplicate by 50%/100% of its value.
 * R4: While Duplicate is active, Ebon Might grants 100% additional stats, and your Eruption and Upheaval* deal 25% additional damage.
 * *As of current alpha build, Upheaval is not affected.
 */
class Duplicate extends Analyzer {
  canExtendDuplicate = this.selectedCombatant.hasTalent(
    TALENTS_EVOKER.DUPLICATE_EXTENSION_AUGMENTATION_TALENT,
  );
  duplicateBuffsEbonMight = this.selectedCombatant.hasTalent(
    TALENTS_EVOKER.DUPLICATE_AMP_AUGMENTATION_TALENT,
  );
  petDamage = 0;
  eruptionDamage = 0;
  externalDamage = 0;
  personalEbonMightDamage = 0;
  personalEbonMightIsAmped = false;
  //Eruption excluded from this list due to being buffed twice.
  personalBuffedSpells = [
    SPELLS.DEEP_BREATH_DAM,
    SPELLS.FIRE_BREATH_DOT,
    SPELLS.LIVING_FLAME_DAMAGE,
    SPELLS.AZURE_STRIKE,
    SPELLS.UNRAVEL,
    SPELLS.UPHEAVAL_DAM,
    SPELLS.MELT_ARMOR,
  ];

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(
      TALENTS_EVOKER.DUPLICATE_BASE_AUGMENTATION_TALENT,
    );
    // Filtering to SELECTED_PLAYER_PET breaks this. Eruption and Fire Breath use separate IDs,
    // so no filtering needed, but Upheaval uses the same ID as the player so must be distinguished.
    // Additionally, the damage numbers are slightly inflated if there are multiple Augs,
    // suggesting that some events from another Aug are being included.
    this.addEventListener(
      Events.damage.spell([SPELLS.DUPLICATE_ERUPTION, SPELLS.DUPLICATE_FIRE_BREATH]),
      this.onPetDamage,
    );

    this.addEventListener(Events.damage.spell([SPELLS.UPHEAVAL_DAM]), this.onPetUpheavalDamage);

    if (this.duplicateBuffsEbonMight) {
      //If this is fixed to also buff Upheaval,
      //add Upheaval (and Reverberations) here.
      this.addEventListener(
        Events.damage
          .by(SELECTED_PLAYER)
          .spell([TALENTS.ERUPTION_TALENT, SPELLS.MASS_ERUPTION_DAMAGE]),
        this.onEruptionDamage,
      );

      this.addEventListener(
        Events.damage.by(SELECTED_PLAYER).spell(SPELLS.EBON_MIGHT_BUFF_EXTERNAL),
        this.onExternalDamage,
      );
      this.addEventListener(
        Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.EBON_MIGHT_BUFF_PERSONAL),
        this.updatePersonalEbonMightAmp,
      );
      this.addEventListener(
        Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.EBON_MIGHT_BUFF_PERSONAL),
        this.updatePersonalEbonMightAmp,
      );
      this.addEventListener(
        Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.EBON_MIGHT_BUFF_PERSONAL),
        this.onEbonRemove,
      );

      this.addEventListener(
        Events.damage.by(SELECTED_PLAYER).spell(this.personalBuffedSpells),
        this.onPersonalDamage,
      );

      if (this.selectedCombatant.hasTalent(TALENTS.REVERBERATIONS_TALENT)) {
        this.addEventListener(
          Events.empowerEnd.by(SELECTED_PLAYER).spell([SPELLS.UPHEAVAL, SPELLS.UPHEAVAL_FONT]),
          this.addReverberationsDamage,
        );
      }
    }
  }

  onPetDamage(event: DamageEvent) {
    this.petDamage += event.amount;
  }

  onPetUpheavalDamage(event: DamageEvent) {
    if (event.sourceID === this.selectedCombatant.id) return;
    this.petDamage += event.amount;
  }

  onEruptionDamage(event: DamageEvent) {
    if (
      this.selectedCombatant.hasBuff(SPELLS.DUPLICATE_SELF_BUFF.id) &&
      this.selectedCombatant.hasBuff(SPELLS.EBON_MIGHT_BUFF_PERSONAL.id) &&
      this.personalEbonMightIsAmped
    ) {
      let totalAmpedDamage = calculateEffectiveDamage(
        event,
        (1 + DUPLICATE_PERSONAL_DAMAGE_MULTIPLIER) *
          (1 + EBON_MIGHT_PERSONAL_DAMAGE_AMP * (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1)) -
          1,
      );
      this.eruptionDamage +=
        totalAmpedDamage *
        (DUPLICATE_PERSONAL_DAMAGE_MULTIPLIER /
          (DUPLICATE_PERSONAL_DAMAGE_MULTIPLIER +
            EBON_MIGHT_PERSONAL_DAMAGE_AMP * (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1)));
      this.personalEbonMightDamage +=
        totalAmpedDamage *
        ((EBON_MIGHT_PERSONAL_DAMAGE_AMP * (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1)) /
          (DUPLICATE_PERSONAL_DAMAGE_MULTIPLIER +
            EBON_MIGHT_PERSONAL_DAMAGE_AMP * (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1))) *
        (DUPLICATE_EBON_MIGHT_MULTIPLIER / (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1));
    } else if (this.selectedCombatant.hasBuff(SPELLS.DUPLICATE_SELF_BUFF.id)) {
      this.eruptionDamage += calculateEffectiveDamage(event, DUPLICATE_PERSONAL_DAMAGE_MULTIPLIER);
    } else if (
      this.selectedCombatant.hasBuff(SPELLS.EBON_MIGHT_BUFF_PERSONAL.id) &&
      this.personalEbonMightIsAmped
    ) {
      this.personalEbonMightDamage +=
        calculateEffectiveDamage(
          event,
          EBON_MIGHT_PERSONAL_DAMAGE_AMP * (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1),
        ) *
        (DUPLICATE_EBON_MIGHT_MULTIPLIER / (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1));
    }
  }

  onExternalDamage(event: DamageEvent) {
    if (this.selectedCombatant.hasBuff(SPELLS.DUPLICATE_SELF_BUFF.id)) {
      //This is approximate. Certain abilities (e.g. Ignite) do their damage over time,
      //meaning that the Duplicate buff may no longer be active when the damage is dealt,
      //and vice versa.
      this.externalDamage += calculateEffectiveDamage(event, DUPLICATE_EBON_MIGHT_MULTIPLIER);
    }
  }

  updatePersonalEbonMightAmp() {
    if (this.selectedCombatant.hasBuff(SPELLS.DUPLICATE_SELF_BUFF.id)) {
      this.personalEbonMightIsAmped = true;
    } else {
      this.personalEbonMightIsAmped = false;
    }
  }

  onEbonRemove() {
    this.personalEbonMightIsAmped = false;
  }

  onPersonalDamage(event: DamageEvent) {
    if (
      this.selectedCombatant.hasBuff(SPELLS.EBON_MIGHT_BUFF_PERSONAL.id) &&
      this.personalEbonMightIsAmped
    ) {
      this.personalEbonMightDamage +=
        calculateEffectiveDamage(
          event,
          EBON_MIGHT_PERSONAL_DAMAGE_AMP * (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1),
        ) *
        (DUPLICATE_EBON_MIGHT_MULTIPLIER / (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1));
    }
  }

  addReverberationsDamage(event: EmpowerEndEvent) {
    if (
      this.selectedCombatant.hasBuff(SPELLS.EBON_MIGHT_BUFF_PERSONAL.id) &&
      this.personalEbonMightIsAmped
    ) {
      const reverbEvents = GetRelatedEvents<DamageEvent>(event, UPHEAVAL_REVERBERATION_DAM_LINK);

      reverbEvents.forEach((reverbEvent) => {
        this.personalEbonMightDamage +=
          calculateEffectiveDamage(
            reverbEvent,
            EBON_MIGHT_PERSONAL_DAMAGE_AMP * (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1),
          ) *
          (DUPLICATE_EBON_MIGHT_MULTIPLIER / (DUPLICATE_EBON_MIGHT_MULTIPLIER + 1));
      });
    }
  }

  statistic() {
    const buffUptime =
      this.selectedCombatant.getBuffUptime(SPELLS.DUPLICATE_SELF_BUFF.id) /
      this.owner.fightDuration;

    const damageSources = [
      {
        color: 'rgb(255, 255, 0)',
        label: 'Future Self pet damage',
        spellId: TALENTS_EVOKER.DUPLICATE_BASE_AUGMENTATION_TALENT.id,
        valueTooltip: formatNumber(this.petDamage),
        value: this.petDamage,
      },
      {
        color: 'rgb(129, 52, 5)',
        label: 'Eruption amp',
        spellId: TALENTS_EVOKER.ERUPTION_TALENT.id,
        valueTooltip: formatNumber(this.eruptionDamage),
        value: this.eruptionDamage,
      },
      {
        color: 'rgb(51, 147, 127)',
        label: 'Personal Ebon Might amp',
        spellId: SPELLS.EBON_MIGHT_BUFF_PERSONAL.id,
        valueTooltip: formatNumber(this.personalEbonMightDamage),
        value: this.personalEbonMightDamage,
      },
      {
        color: 'rgb(212, 81, 19)',
        label: 'External Ebon Might amp',
        spellId: SPELLS.EBON_MIGHT_BUFF_EXTERNAL.id,
        valueTooltip: formatNumber(this.externalDamage),
        value: this.externalDamage,
      },
    ];
    if (this.duplicateBuffsEbonMight) {
      return (
        <Statistic
          position={STATISTIC_ORDER.CORE(1)}
          size="flexible"
          category={STATISTIC_CATEGORY.TALENTS}
        >
          <TalentSpellText talent={TALENTS_EVOKER.DUPLICATE_BASE_AUGMENTATION_TALENT}>
            <div>
              <ItemDamageDone amount={this.petDamage + this.eruptionDamage + this.externalDamage} />
              <br />
              <InformationIcon /> {formatPercentage(buffUptime, 2)}%<small> Duplicate uptime</small>
            </div>
          </TalentSpellText>
          <div className="pad">
            <label>Damage sources</label>
            <DonutChart items={damageSources} />
          </div>
        </Statistic>
      );
    } else if (this.canExtendDuplicate) {
      return (
        <Statistic
          position={STATISTIC_ORDER.CORE(1)}
          size="flexible"
          category={STATISTIC_CATEGORY.TALENTS}
        >
          <TalentSpellText talent={TALENTS_EVOKER.DUPLICATE_BASE_AUGMENTATION_TALENT}>
            <div>
              <ItemDamageDone amount={this.petDamage} />
              <br />
              <InformationIcon /> {formatPercentage(buffUptime, 2)}%<small> Duplicate uptime</small>
            </div>
          </TalentSpellText>
        </Statistic>
      );
    } else {
      return (
        <Statistic
          position={STATISTIC_ORDER.CORE(1)}
          size="flexible"
          category={STATISTIC_CATEGORY.TALENTS}
        >
          <TalentSpellText talent={TALENTS_EVOKER.DUPLICATE_BASE_AUGMENTATION_TALENT}>
            <div>
              <ItemDamageDone amount={this.petDamage} />
            </div>
          </TalentSpellText>
        </Statistic>
      );
    }
  }
}

export default Duplicate;
