import styled from 'styled-components';
import getColor from './utils/getColor';

const GrabWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: absolute;
  top: 0px;
  bottom: 0px;
  left: 0;
  // margin-right: 10px;
  padding-left: 10px;
  border-right: 1px solid
    ${({ isOverEditBlock, isOverRemove, isSelected }) =>
      getColor(isOverRemove, isSelected, isOverEditBlock)};
  cursor: move;
  z-index: 99;

  ${({ isOverEditBlock, isOverRemove, isSelected }) => {
    if (isOverRemove) {
      return `
    g {
      fill: #ffa784;
    }
    `;
    }

    if (isSelected || isOverEditBlock) {
      return `
    g {
      fill: #007eff;
    }
    `;
    }
  }}
`;

export default GrabWrapper;
