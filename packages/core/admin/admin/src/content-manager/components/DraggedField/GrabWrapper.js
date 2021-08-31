/* eslint-disable */

import styled, { css } from 'styled-components';
import getColor from './utils/getColor';

const GrabWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: absolute;
  top: 0px;
  bottom: 0px;
  left: 0;
  padding-left: 10px;
  border-right: 1px solid
    ${({ isOverEditBlock, isOverRemove, isSelected }) =>
      getColor(isOverRemove, isSelected, isOverEditBlock)};
  cursor: move;
  z-index: 99;

  ${({ isOverRemove }) =>
    isOverRemove &&
    css`
      g {
        fill: #ffa784;
      }
    `}

  ${({ isSelected, isOverEditBlock }) =>
    (isSelected || isOverEditBlock) &&
    css`
      g {
        fill: #aed4fb;
      }
    `}
`;

export default GrabWrapper;
