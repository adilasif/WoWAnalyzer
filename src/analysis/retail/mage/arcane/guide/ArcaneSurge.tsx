import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import { SpellLink } from 'interface';
import { SpellSeq } from 'parser/ui/SpellSeq';
import MageAnalyzer from '../../shared/MageAnalyzer';
import {
  evaluateEvents,
  type ExpandableConfig,
  MageGuideSection,
  ExpandableBreakdown,
  createExpandableConfig,
} from '../../shared/components';

import ArcaneSurge, { ArcaneSurgeData } from '../analyzers/ArcaneSurge';

const ARCANE_CHARGE_MAX_STACKS = 4;
const OPENER_DURATION = 20000;
const SHORT_FIGHT_DURATION = 60000;

class ArcaneSurgeGuide extends MageAnalyzer {
  static dependencies = { ...MageAnalyzer.dependencies, arcaneSurge: ArcaneSurge };

  protected arcaneSurge!: ArcaneSurge;

  hasSiphonStorm: boolean = this.selectedCombatant.hasTalent(TALENTS.EVOCATION_TALENT);
  hasNetherPrecision: boolean = this.selectedCombatant.hasTalent(TALENTS.NETHER_PRECISION_TALENT);

  get arcaneSurgeData() {
    const transformedCasts = this.arcaneSurge.surgeData.map((cast) => ({
      timestamp: cast.cast,
      mana: cast.mana,
      charges: cast.charges,
      siphonStormBuff: cast.siphonStormBuff,
    }));

    return evaluateEvents({
      events: transformedCasts,
      formatTimestamp: this.owner.formatTimestamp.bind(this.owner),
      evaluationLogic: (cast: {
        timestamp: number;
        mana?: number;
        charges: number;
        siphonStormBuff: boolean;
      }) => {
        const opener = cast.timestamp - this.owner.fight.start_time < OPENER_DURATION;
        const hasMaxCharges = cast.charges === ARCANE_CHARGE_MAX_STACKS || opener;
        const fightTimeRemaining = this.owner.fight.end_time - cast.timestamp;
        const shortFight = fightTimeRemaining < SHORT_FIGHT_DURATION;

        return {
          actionName: 'Arcane Surge',

          failConditions: [
            {
              name: 'insufficientCharges',
              check: !hasMaxCharges,
              description: opener
                ? `Opener with ${cast.charges}/${ARCANE_CHARGE_MAX_STACKS} charges`
                : `Only ${cast.charges}/${ARCANE_CHARGE_MAX_STACKS} charges - need 4 or cast Arcane Orb first`,
            },
          ],

          perfectConditions: [
            {
              name: 'allBuffsCombo',
              check: hasMaxCharges && (!this.hasSiphonStorm || cast.siphonStormBuff),
              description:
                'Perfect combo: max charges + all available buffs (Siphon Storm + Nether Precision)',
            },
            {
              name: 'openerPerfect',
              check: opener && (!this.hasSiphonStorm || cast.siphonStormBuff),
              description: 'Perfect opener with available buffs',
            },
          ],

          goodConditions: [
            {
              name: 'maxChargesGood',
              check: hasMaxCharges && cast.siphonStormBuff,
              description: `Good usage: ${cast.charges} charges + ${cast.siphonStormBuff ? 'Siphon Storm' : ''}${cast.siphonStormBuff ? ' + ' : ''} : ''}`,
            },
            {
              name: 'emergencyUsage',
              check: hasMaxCharges && shortFight,
              description: 'Good emergency usage - short fight/encounter ending',
            },
          ],

          okConditions: [
            {
              name: 'basicUsage',
              check: hasMaxCharges,
              description: opener
                ? `Opener usage with ${cast.charges} charges`
                : `Basic usage with ${cast.charges} charges - could optimize with buffs`,
            },
          ],

          defaultPerformance: undefined, // Let it fall through to Fail if requirements not met
          defaultMessage: 'Suboptimal Arcane Surge usage',
        };
      },
    });
  }

  private get expandableConfig(): ExpandableConfig {
    return createExpandableConfig({
      spell: TALENTS.ARCANE_SURGE_TALENT,
      formatTimestamp: (timestamp: number) => this.owner.formatTimestamp(timestamp),
      getTimestamp: (cast: unknown) => (cast as ArcaneSurgeData).cast,
      checklistItems: [
        {
          label: (
            <>
              <SpellLink spell={SPELLS.ARCANE_CHARGE} />s Before Surge
            </>
          ),
          getResult: (cast: unknown) => {
            const surgeCast = cast as ArcaneSurgeData;
            const opener = surgeCast.cast - this.owner.fight.start_time < OPENER_DURATION;
            return surgeCast.charges === ARCANE_CHARGE_MAX_STACKS || opener;
          },
          getDetails: (cast: unknown) => {
            const surgeCast = cast as ArcaneSurgeData;
            const opener = surgeCast.cast - this.owner.fight.start_time < OPENER_DURATION;
            return opener
              ? `${surgeCast.charges}/${ARCANE_CHARGE_MAX_STACKS} charges (opener)`
              : `${surgeCast.charges}/${ARCANE_CHARGE_MAX_STACKS} charges`;
          },
        },
        {
          label: (
            <>
              <SpellLink spell={SPELLS.SIPHON_STORM_BUFF} /> Active
            </>
          ),
          getResult: (cast: unknown) => (cast as ArcaneSurgeData).siphonStormBuff,
          getDetails: (cast: unknown) =>
            (cast as ArcaneSurgeData).siphonStormBuff ? 'Active' : 'Not active',
        },
      ],
    });
  }

  get guideSubsection(): JSX.Element {
    const arcaneOrb = <SpellLink spell={SPELLS.ARCANE_ORB} />;
    const arcaneCharge = <SpellLink spell={SPELLS.ARCANE_CHARGE} />;
    const arcaneSurge = <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} />;
    const evocation = <SpellLink spell={TALENTS.EVOCATION_TALENT} />;
    const clearcasting = <SpellLink spell={SPELLS.CLEARCASTING_ARCANE} />;
    const arcaneMissiles = <SpellLink spell={TALENTS.ARCANE_MISSILES_TALENT} />;
    const siphonStorm = <SpellLink spell={SPELLS.SIPHON_STORM_BUFF} />;

    const explanation = (
      <>
        <b>{arcaneSurge}</b> is your primary damage cooldown and will essentially convert all of
        your mana into damage. Because of this, there are a few things that you should do to ensure
        you maximize the amount of damage that {arcaneSurge} does:
        <ul>
          <li>
            Ensure you have 4 {arcaneCharge}s. Cast {arcaneOrb} if you have less than 4.
          </li>
          <li>
            Full channel {evocation} before each {arcaneSurge} cast to cap your mana and grant an
            intellect buff from {siphonStorm}.
          </li>
          <li>
            Channeling {evocation} will give you a {clearcasting} proc. Cast {arcaneMissiles} to get
            before {arcaneSurge}
          </li>
        </ul>
        When incorporating the above items, your spell sequence will look like this:{' '}
        <SpellSeq
          spells={[
            TALENTS.EVOCATION_TALENT,
            TALENTS.ARCANE_MISSILES_TALENT,
            SPELLS.ARCANE_ORB,
            TALENTS.ARCANE_SURGE_TALENT,
          ]}
        />
      </>
    );

    return (
      <MageGuideSection spell={TALENTS.ARCANE_SURGE_TALENT} explanation={explanation}>
        <ExpandableBreakdown
          castData={this.arcaneSurge.surgeData}
          evaluatedData={this.arcaneSurgeData}
          expandableConfig={this.expandableConfig}
        />
      </MageGuideSection>
    );
  }
}

export default ArcaneSurgeGuide;
