import styled from 'styled-components';

/* eslint-disable indent */
const NameWrapper = styled.div`
  position: relative;
  line-height: 26px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;

  ${({ isOverEditBlock, isOverRemove, isSelected }) => {
    if (isOverRemove) {
      return `
        color: #f64d0a;
      `;
    }

    if (isSelected || isOverEditBlock) {
      return `
        color: #007eff;
    `;
    }

    return '';
  }}
`;

export default NameWrapper;
