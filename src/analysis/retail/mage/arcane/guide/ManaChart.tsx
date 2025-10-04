import React from 'react';
import TALENTS from 'common/TALENTS/mage';
import SPELLS from 'common/SPELLS';
import { SpellLink } from 'interface';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { ChartBuilder, GuideBuilder } from '../../shared/builders';
import ManaValues from 'parser/shared/modules/ManaValues';
import ArcaneSurge from '../analyzers/ArcaneSurge';
import TouchOfTheMagi from '../analyzers/TouchOfTheMagi';
import Events, { CastEvent } from 'parser/core/Events';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import Spell from 'common/SPELLS/Spell';

const SPELL_COLORS = {
  ARCANE_SURGE: '#db35acff', // Pinkish purple
  EVOCATION: '#10B981', // Green
  TOUCH_OF_THE_MAGI: '#F59E0B', // Orange
} as const;

class ManaChart extends MageAnalyzer {
  static dependencies = {
    ...MageAnalyzer.dependencies,
    manaValues: ManaValues,
    arcaneSurge: ArcaneSurge,
    touchOfTheMagi: TouchOfTheMagi,
  };

  protected manaValues!: ManaValues;
  protected arcaneSurge!: ArcaneSurge;
  protected touchOfTheMagi!: TouchOfTheMagi;

  private manaUpdates: Array<{ timestamp: number; current: number; max: number; used: number }> =
    [];
  private evocationCasts: Array<{ timestamp: number; spell: Spell }> = [];

  constructor(options: Options) {
    super(options);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER), this.onCast);
  }

  onCast(event: CastEvent) {
    if (event.prepull || !event.classResources) {
      return;
    }

    const manaResource = event.classResources.find(
      (resource) => resource.type === RESOURCE_TYPES.MANA.id,
    );

    if (manaResource) {
      const currentMana = manaResource.amount - (manaResource.cost || 0);
      this.manaUpdates.push({
        timestamp: event.timestamp,
        current: currentMana,
        max: manaResource.max,
        used: manaResource.cost || 0,
      });
    }

    if (event.ability.guid === TALENTS.EVOCATION_TALENT.id) {
      this.evocationCasts.push({
        timestamp: event.timestamp,
        spell: TALENTS.EVOCATION_TALENT,
      });
    }
  }

  get guideSubsection(): JSX.Element {
    const arcaneSurge = <SpellLink spell={TALENTS.ARCANE_SURGE_TALENT} />;
    const touchOfTheMagi = <SpellLink spell={TALENTS.TOUCH_OF_THE_MAGI_TALENT} />;
    const evocation = <SpellLink spell={TALENTS.EVOCATION_TALENT} />;
    const arcaneBarrage = <SpellLink spell={SPELLS.ARCANE_BARRAGE} />;

    const explanation = (
      <>
        <div>
          <b>Mana Management</b> is crucial for Arcane Mage performance. Proper mana usage involves:
        </div>
        <div>
          <ul>
            <li>
              <strong>Burn Phase:</strong> Use {arcaneSurge} and {touchOfTheMagi} while maintaining
              mana for the full duration. Don't go OOM during major cooldowns.
            </li>
            <li>
              <strong>Conserve Phase:</strong> Use {arcaneBarrage} at 4 stacks to maintain mana
              efficiency while waiting for cooldowns.
            </li>
            <li>
              <strong>Mana Recovery:</strong> Use {evocation} to restore mana during conserve phases
              or between burn windows.
            </li>
            <li>
              <strong>Fight Ending:</strong> Aim to end fights with minimal mana remaining - unused
              mana is wasted potential damage.
            </li>
          </ul>
        </div>
      </>
    );

    const arcaneSurgeCasts = this.arcaneSurge.surgeCasts.map((cast) => ({
      timestamp: cast.cast,
      spell: TALENTS.ARCANE_SURGE_TALENT,
    }));

    const chart = new ChartBuilder(this.owner.fight.start_time, this.owner.fight.end_time)
      .asManaChart()
      .addManaTracking(this.manaUpdates)
      .addCastAnnotations(arcaneSurgeCasts, SPELL_COLORS.ARCANE_SURGE)
      .addCastAnnotations(this.evocationCasts, SPELL_COLORS.EVOCATION)
      .addLowResourceWarnings(this.manaUpdates, 0.1, 'Low Mana')
      .addBossHealth(this.owner.report.code)
      .build();

    return new GuideBuilder(TALENTS.EVOCATION_TALENT, 'Mana Management')
      .explanation(explanation)
      .verticalLayout()
      .addChart(chart)
      .build();
  }
}

export default ManaChart;
