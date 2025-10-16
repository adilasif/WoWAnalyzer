import Spell from 'common/SPELLS/Spell';
import CastSummaryAndBreakdown from 'interface/guide/components/CastSummaryAndBreakdown';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';

interface CastBreakdownProps {
  spell: Spell;
  castEntries: BoxRowEntry[];
}

/**
 * Displays cast summary and breakdown for a spell.
 * Shows overall performance summary and detailed breakdown of each cast.
 */
export default function CastBreakdown({ spell, castEntries }: CastBreakdownProps): JSX.Element {
  return <CastSummaryAndBreakdown spell={spell} castEntries={castEntries} />;
}
