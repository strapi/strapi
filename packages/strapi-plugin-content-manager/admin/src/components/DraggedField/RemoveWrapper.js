import styled from 'styled-components';
import getColor from './utils/getColor';

const RemoveWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: absolute;
  width: 30px;
  text-align: center;
  background-color: ${({ isOverEditBlock, isOverRemove, isSelected }) =>
    getColor(isOverRemove, isSelected, isOverEditBlock)};
  cursor: pointer;

  position: absolute;
  top: 0px;
  bottom: 0px;
  right: 0;

  svg {
    align-self: center;
    color: #b4b6ba;
  }

  ${({ isOverRemove }) => {
    if (isOverRemove) {
      return `
        path {
          fill: #f64d0a;
        }
    `;
    }

    return '';
  }}
`;

export default RemoveWrapper;
