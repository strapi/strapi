/* eslint-disable indent */
import styled from 'styled-components';

const RowWrapper = styled.div`
  ${({ withMargin }) =>
    withMargin &&
    `
      margin: 9px 0;
    `}
`;

export default RowWrapper;
