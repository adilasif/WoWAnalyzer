import { GuideProps, Section, SubSection } from 'interface/guide';
import TALENTS from 'common/TALENTS/warrior';
import { ResourceLink, SpellLink } from 'interface';
import PreparationSection from 'interface/guide/components/Preparation/PreparationSection';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { HideExplanationsToggle } from 'interface/guide/components/HideExplanationsToggle';
import CooldownUsage from 'parser/core/MajorCooldowns/CooldownUsage';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import { HideGoodCastsToggle } from 'interface/guide/components/HideGoodCastsToggle';
import { formatPercentage } from 'common/format';
import ActiveTimeGraph from 'parser/ui/ActiveTimeGraph';
import CombatLogParser from './CombatLogParser';
import FoundationDowntimeSectionV2 from 'interface/guide/foundation/FoundationDowntimeSectionV2';
import CooldownGraphSubsection from './guide/CooldownGraphSubSection';

export default function Guide({ modules, events, info }: GuideProps<typeof CombatLogParser>) {
  return (
    <>
      <Section title="Preface & Disclaimers">
        <>
          When reviewing this information, keep in mind that WoWAnalyzer is limited to the
          information that is present in your combat log. As a result, we have no way of knowing if
          you were intentionally doing something suboptimal because the fight or strat required it
          (such as forced downtime or holding cooldowns for a burn phase). Because of this, we
          recommend comparing your analysis against a top 100 log for the same boss.
          <br />
          <br />
          For additional assistance in improving your gameplay, or to have someone look more in
          depth at your combat logs, please visit the{' '}
          <a href="https://discord.gg/skyhold">Skyhold</a> discord.
          <br />
          <br />
          If you notice any issues or errors in this analysis or if there is additional analysis you
          would like added, please ping <code>@Bigbowwl</code> in the{' '}
          <a href="https://discord.gg/skyhold">Skyhold</a> discord.
        </>
      </Section>
      <Section title="Always Be Casting">
        <FoundationDowntimeSectionV2 />
      </Section>
      {/* <ResourceUsageSection modules={modules} events={events} info={info} /> */}
      <CooldownSection modules={modules} events={events} info={info} />
      {/* <RotationSection modules={modules} events={events} info={info} /> */}
      <PreparationSection />
    </>
  );
}

function CooldownSection({ modules, info }: GuideProps<typeof CombatLogParser>) {
  return (
    <Section title="Cooldowns">
      <HideExplanationsToggle id="hide-explanations-cooldowns" />
      <HideGoodCastsToggle id="hide-good-casts-cooldowns" />
      <CooldownGraphSubsection />
      {/* <CooldownUsage analyzer={modules.essenceBreak} title="Essence Break" />
      <CooldownUsage analyzer={modules.eyeBeam} title="Eye Beam" /> */}
    </Section>
  );
}
