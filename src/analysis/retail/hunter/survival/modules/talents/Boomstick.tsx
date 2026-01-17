import type { JSX } from 'react';
import { formatNumber } from 'common/format';
import SPELLS from 'common/SPELLS/hunter';
import TALENTS from 'common/TALENTS/hunter';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  CastEvent,
  DamageEvent,
  EndChannelEvent,
  GetRelatedEvent,
  GetRelatedEvents,
  HasAbility,
} from 'parser/core/Events';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { BadColor, GoodColor, OkColor } from 'interface/guide';
import {
  BOOMSTICK_CAST_HIT,
  BOOMSTICK_CAST_END,
  BOOMSTICK_NEXT_CAST,
} from '../../normalizers/BoomstickNormalizer';

/**
 * Boomstick analyzer
 *
 * Boomstick is a 3-second channeled ability that fires a directional cone of damage.
 * It deals damage in 4 ticks at 1s intervals (hasted).
 */
class Boomstick extends Analyzer {
  private totalDamage = 0;
  private totalHits = 0;
  private totalTicks = 0;
  private useEntries: BoxRowEntry[] = [];
  private clippedCasts = 0;

  private static readonly BUCKET_WINDOW_MS = 100;
  private static readonly EXPECTED_TICKS = 4;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.BOOMSTICK_TALENT);
    if (!this.active) {
      return;
    }

    this.addEventListener(
      Events.EndChannel.by(SELECTED_PLAYER).spell(TALENTS.BOOMSTICK_TALENT),
      this.onEndChannel,
    );
  }

  private onEndChannel = (event: EndChannelEvent) => {
    const cast = GetRelatedEvent<CastEvent>(event, BOOMSTICK_CAST_END);
    if (!cast) {
      return;
    }

    // Check if Tip of the Spear was active at the time of cast
    const tipped = this.selectedCombatant.hasBuff(SPELLS.TIP_OF_THE_SPEAR_CAST.id, cast.timestamp);

    const hits = GetRelatedEvents<DamageEvent>(cast, BOOMSTICK_CAST_HIT).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Group damage events into ticks based on timestamp proximity
    const buckets = hits.reduce<DamageEvent[][]>((acc, hit) => {
      const lastBucket = acc[acc.length - 1];
      if (!lastBucket || hit.timestamp - lastBucket[0].timestamp > Boomstick.BUCKET_WINDOW_MS) {
        acc.push([hit]);
      } else {
        lastBucket.push(hit);
      }
      return acc;
    }, []);

    const tickCount = buckets.length;

    // Summaries for Guide Tooltip
    const tickSummaries = buckets.map((bucket) => {
      const damage = bucket.reduce((sum, hit) => sum + hit.amount + (hit.absorbed ?? 0), 0);
      return { targetsHit: bucket.length, damage, timestamp: bucket[0].timestamp };
    });

    const tickTotalDamage = tickSummaries.reduce((sum, tick) => sum + tick.damage, 0);
    const tickTotalHits = tickSummaries.reduce((sum, tick) => sum + tick.targetsHit, 0);
    this.totalDamage += tickTotalDamage;
    this.totalHits += tickTotalHits;
    this.totalTicks += tickSummaries.length;

    // Check if the channel was clipped
    // Don't count clipped if 4 ticks (normalizer buffer picked up a quick post-channel cast)
    const nextAbility = GetRelatedEvent(event, BOOMSTICK_NEXT_CAST);
    const wasClipped =
      tickCount < Boomstick.EXPECTED_TICKS && nextAbility !== undefined && HasAbility(nextAbility);

    let value: QualitativePerformance;
    let header: JSX.Element;
    let clippingInfo: JSX.Element | null = null;

    if (!tipped) {
      // No Tip of the Spear = FAIL
      value = QualitativePerformance.Fail;
      header = <h5 style={{ color: BadColor }}>Bad cast: no Tip of the Spear.</h5>;
    } else if (tickCount === Boomstick.EXPECTED_TICKS) {
      // Perfect: 4 ticks + tipped = GOOD
      value = QualitativePerformance.Good;
      header = <h5 style={{ color: GoodColor }}>Good cast: tipped with all ticks.</h5>;
    } else if (wasClipped) {
      // Clipped with another ability = FAIL
      value = QualitativePerformance.Fail;
      this.clippedCasts += 1;
      header = <h5 style={{ color: BadColor }}>Bad cast: channel clipped early.</h5>;
      if (nextAbility && HasAbility(nextAbility)) {
        clippingInfo = (
          <div>
            <strong>Clipped by:</strong> <SpellLink spell={nextAbility.ability.guid} />
          </div>
        );
      }
    } else if (tickCount === 3) {
      // 3 ticks + not clipped = OK (likely missed one tick due to aim/target movement)
      value = QualitativePerformance.Ok;
      header = <h5 style={{ color: OkColor }}>Acceptable: tipped but missed 1 tick.</h5>;
    } else {
      // <3 ticks + not clipped = FAIL (missed multiple ticks, very poor aim)
      value = QualitativePerformance.Fail;
      header = (
        <h5 style={{ color: BadColor }}>
          Bad cast: missed {Boomstick.EXPECTED_TICKS - tickCount} ticks.
        </h5>
      );
    }

    const tickLines = tickSummaries.map((tick, index) => (
      <div key={tick.timestamp}>
        Tick {index + 1}: <strong>{tick.targetsHit}</strong> targets{' '}
        <small>({formatNumber(tick.damage)} damage)</small>
      </div>
    ));

    const tooltip = (
      <div>
        {header}
        <strong>{this.owner.formatTimestamp(cast.timestamp)}</strong>
        {tickCount !== Boomstick.EXPECTED_TICKS && (
          <div>
            Ticks: {tickCount}/{Boomstick.EXPECTED_TICKS}{' '}
            <small>
              {wasClipped
                ? '(clipped channel)'
                : `(missed ${Boomstick.EXPECTED_TICKS - tickCount} tick${Boomstick.EXPECTED_TICKS - tickCount !== 1 ? 's' : ''})`}
            </small>
          </div>
        )}
        {tickLines}
        <div>
          <strong>Total Damage:</strong> {formatNumber(tickTotalDamage)}
        </div>
        {clippingInfo}
      </div>
    );

    this.useEntries.push({ value, tooltip });
  };

  get guideSubsection(): JSX.Element {
    const explanation = (
      <p>
        <strong>
          <SpellLink spell={TALENTS.BOOMSTICK_TALENT} />
        </strong>{' '}
        should always be cast with <SpellLink spell={SPELLS.TIP_OF_THE_SPEAR_CAST.id} /> active.
        Additionally, avoid interrupting the channel early - let it complete all 4 ticks for maximum
        damage. Because Boomstick is a directional cone ability, ensure you're facing targets to
        avoid missing ticks.
      </p>
    );

    const data = (
      <CastSummaryAndBreakdown
        spell={TALENTS.BOOMSTICK_TALENT}
        castEntries={this.useEntries}
        badExtraExplanation={<>missing Tip of the Spear or clipped channel</>}
        usesInsteadOfCasts
      />
    );

    return explanationAndDataSubsection(explanation, data);
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE()}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
      >
        <BoringSpellValueText spell={TALENTS.BOOMSTICK_TALENT}>
          <>
            <ItemDamageDone amount={this.totalDamage} />
            {this.totalHits} <small>targets hit</small>
            <br />
            {(this.totalTicks > 0 ? this.totalHits / this.totalTicks : 0).toFixed(1)}{' '}
            <small>avg targets/tick</small>
            {this.clippedCasts > 0 && (
              <>
                <br />
                {this.clippedCasts} <small>clipped casts</small>
              </>
            )}
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default Boomstick;
