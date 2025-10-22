import styled from '@emotion/styled';
import { ReactNode } from 'react';
import { CooldownBar, CooldownWindow, GapHighlight } from 'parser/ui/CooldownBar';
import { SpellIcon, SpellLink, TooltipElement } from 'interface';
import { BadColor, GoodColor, MediocreColor, OkColor, useAnalyzer } from 'interface/guide';
import CastEfficiency from 'parser/shared/modules/CastEfficiency';
import Abilities from 'parser/core/modules/Abilities';
import { formatPercentage } from 'common/format';
import Spell from 'common/SPELLS/Spell';

interface Props {
  /** The spell to show cooldown bars for - this must match the ID of the spell's cast event */
  spell: Spell | number;
  /** Gap highlight mode - see {@link GapHighlight} */
  gapHighlightMode: GapHighlight;
  /** If true, spell uses will be represented by a minimal white line instead of the spell icon.
   *  Useful for spells on CD shorter than 30s where the icons might be too closely packed to
   *  be usable */
  minimizeIcons?: boolean;
  slimLines?: boolean;
  /**
   * Windows where the spell is actually usable. Useful for execute spells or spells that only become active inside of a cooldown.
   *
   * If not specified, defaults to the whole fight.
   */
  activeWindows?: CooldownWindow[];
  /** If true, hides the cast efficiency percentage and icon on the left side.
   *  Useful when you want just the timeline visualization in a guide section. */
  hideEfficiency?: boolean;
  /** If provided, shows explanatory text above the cooldown bar.
   *  Text is automatically generated based on whether the spell has charges. */
  showExplanation?: boolean;
}

/**
 * Displays a spell's cast efficiency on the left,
 * and then that spell's {@link CooldownBar} on the right.
 * @param spell the spell or spell ID to show cast effic and cooldowns for
 * @param gapHighlightMode see {@link CooldownBar} props
 * @param minimizeIcons see {@link CooldownBar} props
 * @param useThresholds iff true, the cast efficiency percentage will be color coded by performance
 *    using the abilities efficiency requirements.
 * @param slimLines iff true, then cast lines will be skinnier. Very useful for high CPM abilities!
 * @param hideEfficiency iff true, hides the left side efficiency display (useful for guide sections)
 * @param showExplanation iff true, shows explanatory text above the timeline
 */
export default function CastEfficiencyBar({
  spell,
  gapHighlightMode,
  minimizeIcons,
  useThresholds,
  slimLines,
  activeWindows,
  hideEfficiency,
  showExplanation,
}: Props & {
  useThresholds?: boolean;
}): JSX.Element {
  const rawSpellId = typeof spell === 'number' ? spell : spell.id;
  const spellObj = typeof spell === 'number' ? spell : spell;
  const castEffic = useAnalyzer(CastEfficiency)?.getCastEfficiencyForSpellId(rawSpellId);
  const abilities = useAnalyzer(Abilities);

  // Determine if spell has charges for explanation text
  const ability = abilities?.getAbility(rawSpellId);
  const hasCharges = ability && ability.charges > 1;
  let tooltip: ReactNode = `Couldn't get cast efficiency info!`;
  let utilDisplay = `N/A`;
  let textColor: string | undefined;
  if (castEffic && castEffic.efficiency !== null) {
    const gotMaxCasts = castEffic.casts === castEffic.maxCasts;
    const effectiveUtil = gotMaxCasts ? 1 : castEffic.efficiency;

    if (useThresholds) {
      if (effectiveUtil < castEffic.majorIssueEfficiency) {
        textColor = BadColor;
      } else if (effectiveUtil < castEffic.averageIssueEfficiency) {
        textColor = MediocreColor;
      } else if (effectiveUtil < castEffic.recommendedEfficiency) {
        textColor = OkColor;
      } else {
        textColor = GoodColor;
      }
    }

    const windowName =
      activeWindows === undefined ? 'the encounter' : 'the time that it was usable';

    utilDisplay = formatPercentage(effectiveUtil, 0) + '%';
    tooltip = (
      <>
        You cast <SpellLink spell={spellObj} /> <strong>{castEffic.casts}</strong> out of{' '}
        <strong>{castEffic.maxCasts}</strong> possible times.
        <br />
        It was on cooldown for <strong>{formatPercentage(castEffic.efficiency, 0)}%</strong> of{' '}
        {windowName}.
        <br />
        {gotMaxCasts && '(100% cast efficiency because you used the maximum possible casts)'}
      </>
    );
  }

  return (
    <div>
      {showExplanation && (
        <ExplanationText>
          <strong>Cooldown Timeline</strong>
          <small>
            {hasCharges ? (
              <>
                {' '}
                - yellow when cooling down, red when all charges available, white lines show casts.
              </>
            ) : (
              <>
                {' '}
                - red gaps are times the spell was available but not cast, white lines show casts.
              </>
            )}
          </small>
        </ExplanationText>
      )}
      {hideEfficiency ? (
        <CooldownBar
          activeWindows={activeWindows}
          spellId={rawSpellId}
          gapHighlightMode={gapHighlightMode}
          minimizeIcons={minimizeIcons}
          slimLines={slimLines}
        />
      ) : (
        <CooldownUtilBarContainer>
          <div style={{ color: textColor }}>
            <SpellIcon spell={spellObj} style={{ height: '28px' }} />{' '}
            <TooltipElement content={tooltip}>
              {utilDisplay} <small>effic</small>
            </TooltipElement>
          </div>
          <CooldownBar
            activeWindows={activeWindows}
            spellId={rawSpellId}
            gapHighlightMode={gapHighlightMode}
            minimizeIcons={minimizeIcons}
            slimLines={slimLines}
          />
        </CooldownUtilBarContainer>
      )}
    </div>
  );
}

const CooldownUtilBarContainer = styled.div`
  font-size: 20px;
  padding: 2px;
  display: grid;
  grid-column-gap: 1em;
  grid-template-columns: 120px 1fr;
  align-items: center;
`;

const ExplanationText = styled.div`
  margin-bottom: 8px;

  strong {
    display: block;
  }

  small {
    color: #999;
  }
`;
