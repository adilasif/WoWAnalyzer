import React from 'react';
import { SubSection } from 'interface/guide';
import TALENTS from 'common/TALENTS/mage';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import MageAnalyzer from '../../shared/MageAnalyzer';
import { ArcaneManaExplanation } from '../../shared/components';
import { createChart } from '../../shared/builders';
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
    const arcaneSurgeCasts = this.arcaneSurge.surgeCasts.map((cast) => ({
      timestamp: cast.cast,
      spell: TALENTS.ARCANE_SURGE_TALENT,
    }));

    const chart = createChart(this.owner.fight.start_time, this.owner.fight.end_time)
      .asManaChart()
      .addManaTracking(this.manaUpdates)
      .addCastAnnotations(arcaneSurgeCasts, SPELL_COLORS.ARCANE_SURGE)
      .addCastAnnotations(this.evocationCasts, SPELL_COLORS.EVOCATION)
      .addLowResourceWarnings(this.manaUpdates, 0.1, 'Low Mana')
      .buildWithBossHealth(this.owner.report.code);

    return (
      <SubSection title="Mana Management">
        <ArcaneManaExplanation />
        <div style={{ marginTop: '16px' }}>{chart}</div>
      </SubSection>
    );
  }
}

export default ManaChart;
