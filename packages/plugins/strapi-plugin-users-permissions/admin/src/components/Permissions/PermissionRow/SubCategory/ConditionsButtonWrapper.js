/* eslint-disable indent */
import styled from 'styled-components';

const ConditionsButtonWrapper = styled.div`
  padding: 0.9rem;
  ${({ hasConditions }) =>
    hasConditions &&
    `
    padding-left: 22px;
  `}
`;

export default ConditionsButtonWrapper;
