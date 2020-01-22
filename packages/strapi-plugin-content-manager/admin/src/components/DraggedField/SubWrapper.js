/* eslint-disable */

import styled from 'styled-components';
import getColor from './utils/getColor';
import getHeight from './utils/getHeight';

const SubWrapper = styled.div`
  position: relative;
  min-height: ${({ withLongerHeight }) => getHeight(withLongerHeight)};
  ${({ withLongerHeight }) => {
    if (!withLongerHeight) {
      return `
        height: 30px;
    `;
    }
  }};

  line-height: ${({ withLongerHeight }) => getHeight(withLongerHeight)};
  cursor: pointer;

  background: ${({ isOverEditBlock, isOverRemove, isSelected }) => {
    if (isOverRemove) {
      return '#ffe9e0';
    } else if (isSelected || isOverEditBlock) {
      return '#e6f0fb';
    } else {
      return '#fafafb';
    }
  }};
  border: 1px solid
    ${({ isOverEditBlock, isOverRemove, isSelected }) =>
      getColor(isOverRemove, isSelected, isOverEditBlock)};
  border-radius: 2px;
`;

export default SubWrapper;
