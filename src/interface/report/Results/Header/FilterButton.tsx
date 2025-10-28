import styled from '@emotion/styled';
import * as design from 'interface/design-system';

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
    padding-left: 0.25rem;
    font-size: 75%;
  }

  &:hover {
    filter: brightness(115%);
  }
`;

export default function FilterButton(): JSX.Element | null {
  return (
    <Btn>
      Filter <span className="glyphicon glyphicon-filter" />
    </Btn>
  );
}
