import styled from '@emotion/styled';
import { formatDuration } from 'common/format';
import * as design from 'interface/design-system';
import { useReport } from 'interface/report/context/ReportContext';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import TimeFilter from '../TimeFilter';
import Fight from 'parser/core/Fight';
import { SELECTION_ALL_PHASES, SELECTION_CUSTOM_PHASE } from 'interface/report/hooks/usePhases';
import { Filter } from 'interface/report/hooks/useTimeEventFilter';
import { useFight } from 'interface/report/context/FightContext';

const Btn = styled.button`
  appearance: none;
  border: none;
  box-shadow: ${design.level2.shadow};
  background: ${design.level2.background};
  border: 1px solid ${design.level2.border};
  border-radius: 0.5rem;
  padding: 0 1rem;

  align-self: start;
  margin-top: 0.6rem;

  & .glyphicon {
    padding-right: 0.25rem;
    font-size: 75%;
  }

  &:hover {
    filter: brightness(115%);
  }
`;

interface Props {
  fight: Fight;
  handlePhaseSelection: (phaseIndex: number) => void;
  handleTimeSelection: (start: number, end: number) => void;
  timeFilter: Filter | undefined;
  selectedPhaseIndex: number;
}

export default function FilterButton(props: Props): JSX.Element | null {
  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = useCallback(() => {
    setShowMenu(false);
  }, []);
  const toggleMenu = useCallback(() => setShowMenu((v) => !v), []);

  const ref = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useClickOutsideHandler([ref, dialogRef], closeMenu);
  const phases = usePhases();

  const filterLabel = useMemo(() => {
    if (props.selectedPhaseIndex >= 0) {
      return `Filter: ${
        phases.find((phase) => phase.value === props.selectedPhaseIndex)?.label ?? 'Unknown Phase'
      }`;
    }
    if (props.timeFilter) {
      return `Filter: ${formatDuration(props.timeFilter.start - props.fight.start_time)} to ${formatDuration(props.timeFilter.end - props.fight.start_time)}`;
    }

    return 'Filter';
  }, [props.selectedPhaseIndex, props.timeFilter]);

  return (
    <>
      <Btn ref={ref} onClick={toggleMenu}>
        <span className="glyphicon glyphicon-filter" /> {filterLabel}
      </Btn>
      {showMenu &&
        createPortal(<FilterMenu {...props} ref={dialogRef} triggerRef={ref} />, document.body)}
    </>
  );
}

const FilterDialogContainer = styled.dialog`
  position: absolute;
  z-index: 1000;
  margin: 0;
  padding: 1rem;

  display: flex;
  flex-direction: column;

  gap: 0.5rem;

  border: 1px solid ${design.level2.border};
  box-shadow: ${design.level1.shadow};
  background: ${design.level1.background};
  border-radius: 0.5rem;

  color: ${design.colors.bodyText};
`;

interface FilterMenuProps extends Props {
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}

const FilterRadioButton = styled.label`
  border: 1px solid ${design.level2.border};
  background: ${design.level2.background};
  box-shadow: ${design.level2.shadow};
  padding: 0.5rem 1rem;
  position: relative;
  flex-grow: 1;
  // z-index hack for shadows
  z-index: 0;

  font-weight: normal;

  &:first-of-type {
    border-top-left-radius: 0.5rem;
    border-bottom-left-radius: 0.5rem;
  }

  &:last-of-type {
    border-top-right-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
  }

  & input[type='radio'] {
    appearance: none;
    background: none;
    border: none;
  }

  &:hover {
    filter: brightness(115%);
  }

  &:has(input[type='radio']:checked) {
    border-color: ${design.colors.wowaYellow};
    background: ${design.level2.background_active};
    z-index: 1;
  }
`;

const FilterRadioGroup = styled.div`
  display: flex;
`;

const PhaseSelect = styled.select`
  background: ${design.level2.background};
  border: 1px solid ${design.level2.border};
  box-shadow: ${design.level2.shadow};
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;

  color: ${design.colors.bodyText};
`;

// TODO: better/custom ui for dungeon pulls?
type FilterMode = 'phase' | 'time';

const TimeFilterContainer = styled.div`
  & .time-input {
    display: flex;
    flex-wrap: nowrap;
    flex-direction: row;
    align-items: center;
  }

  & > form {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    align-items: end;
  }
`;

const FilterMenu = React.forwardRef<HTMLDialogElement, FilterMenuProps>(
  (
    {
      triggerRef,
      fight,
      selectedPhaseIndex: selectedPhase,
      handlePhaseSelection,
      handleTimeSelection,
    },
    ref,
  ): JSX.Element => {
    const position = useMemo(
      () =>
        triggerRef.current
          ? {
              top: `calc(${triggerRef.current.getBoundingClientRect().top + triggerRef.current.clientHeight}px + 0.5rem)`,
              left: triggerRef.current.getBoundingClientRect().left,
            }
          : undefined,
      [triggerRef],
    );

    const [selectedMode, setSelectedMode] = useState<FilterMode>('phase');

    const phaseLabel = fight?.dungeonPulls ? 'By Pull' : 'By Phase';

    // FIXME: dungeon pulls
    const phases = usePhases();

    useEffect(() => {
      // don't allow staying on the phase option if there are no phases
      if (phases.length === 0) {
        setSelectedMode('time');
      }
    }, [phases.length]);

    return (
      <FilterDialogContainer ref={ref} style={position} open>
        {phases?.length > 0 && (
          <FilterRadioGroup>
            <FilterRadioButton>
              <input
                type="radio"
                name="header-filter-mode"
                value="phase"
                checked={selectedMode === 'phase'}
                onChange={() => setSelectedMode('phase')}
              />
              {phaseLabel}
            </FilterRadioButton>
            <FilterRadioButton>
              <input
                type="radio"
                name="header-filter-mode"
                value="time"
                checked={selectedMode === 'time'}
                onChange={() => setSelectedMode('time')}
              />
              By Time
            </FilterRadioButton>
          </FilterRadioGroup>
        )}
        {selectedMode === 'phase' && (
          <div>
            <PhaseSelect onChange={(e) => handlePhaseSelection(Number(e.target.value))}>
              {selectedPhase === SELECTION_CUSTOM_PHASE && (
                <option key="custom" value={SELECTION_CUSTOM_PHASE} selected>
                  Custom
                </option>
              )}
              <option
                key="all"
                value={SELECTION_ALL_PHASES}
                selected={selectedPhase === SELECTION_ALL_PHASES}
              >
                All Phases
              </option>
              {phases?.map((phase) => (
                <option
                  key={phase.value}
                  value={phase.value}
                  selected={selectedPhase === phase.value}
                >
                  {phase.label}
                </option>
              ))}
            </PhaseSelect>
          </div>
        )}
        {selectedMode === 'time' && (
          <TimeFilterContainer>
            <TimeFilter fight={fight} isLoading={false} applyFilter={handleTimeSelection} />
          </TimeFilterContainer>
        )}
      </FilterDialogContainer>
    );
  },
);

/**
 * Run `handler` when a click occurs on an element outside the trees contained by `ignoredContainers`.
 *
 * `ignoredContainers` is treated like a stable ref, even if it isn't one. Changes to it will not be reflected.
 */
function useClickOutsideHandler(
  ignoredContainers: React.MutableRefObject<HTMLElement | null>[],
  handler: () => void,
): void {
  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      if (!event.target) {
        return;
      }

      const target = event.target as Node;
      if (
        document.contains(target) &&
        !ignoredContainers.some(
          (ref) => ref.current === target || ref.current?.contains(target.parentNode),
        )
      ) {
        handler();
      }
    };
    const escHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler();
      }
    };
    document.addEventListener('click', clickHandler);
    document.addEventListener('keyup', escHandler);
    return () => {
      document.removeEventListener('click', clickHandler);
      document.removeEventListener('keyup', escHandler);
    };
  }, [handler]); // eslint-disable-line react-hooks/exhaustive-deps
}

function usePhases() {
  const { report } = useReport();
  const { fight } = useFight();
  const phases = useMemo(() => {
    const bossPhases = report?.phases.find((phases) => phases.boss === fight?.boss);

    return (
      fight?.phases?.map((phase, index) => ({
        value: index,
        label: `${bossPhases?.phases[phase.id - 1]} ${phase.startTime > fight.start_time ? `(${formatDuration(phase.startTime - fight.start_time)})` : ''}`,
      })) ?? []
    );
  }, [report?.phases, fight?.phases]);

  return phases;
}
