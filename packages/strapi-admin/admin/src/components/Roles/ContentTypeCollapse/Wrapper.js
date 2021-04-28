/* eslint-disable indent */
import styled from 'styled-components';
import CollapsePropertyMatrix from './CollapsePropertyMatrix/Wrapper';

const RowWrapper = styled.div`
  ${({ withMargin }) =>
    withMargin &&
    `
      margin: 9px 0;
    `}

  ${CollapsePropertyMatrix}:last-of-type {
    padding-bottom: 17px;
  }
`;

export default RowWrapper;
