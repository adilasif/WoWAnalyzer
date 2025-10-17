import { ReactNode } from 'react';
import Spell from 'common/SPELLS/Spell';
import { SubSection } from 'interface/guide';
import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import Explanation from 'interface/guide/components/Explanation';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { GUIDE_CORE_EXPLANATION_PERCENT } from '../../../arcane/Guide';

interface MageGuideSectionProps {
  spell: Spell;
  title?: string;
  explanation: ReactNode;
  children: ReactNode;
  verticalLayout?: boolean;
  explanationPercent?: number;
}

/**
 * Guide section component for Mage abilities.
 * Displays explanation and data in either side-by-side or vertical layout.
 */
export default function MageGuideSection({
  spell,
  title,
  explanation,
  children,
  verticalLayout = false,
  explanationPercent = GUIDE_CORE_EXPLANATION_PERCENT,
}: MageGuideSectionProps): JSX.Element {
  const sectionTitle = title || spell.name;

  // Wrap children in divs with spacing
  const childArray = Array.isArray(children) ? children : [children];
  const data = (
    <RoundedPanel>
      <div style={{ minWidth: 0, maxWidth: '100%' }}>
        {childArray.map((component, index) => (
          <div key={index}>{component}</div>
        ))}
      </div>
    </RoundedPanel>
  );

  // Vertical layout
  if (verticalLayout) {
    return (
      <SubSection title={sectionTitle}>
        <div style={{ marginBottom: '16px' }}>
          <Explanation>{explanation}</Explanation>
        </div>
        {data}
      </SubSection>
    );
  }

  // Side-by-side layout
  return explanationAndDataSubsection(
    explanation as JSX.Element,
    data,
    explanationPercent,
    sectionTitle,
  );
}
