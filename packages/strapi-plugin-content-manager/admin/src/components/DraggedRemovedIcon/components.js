import styled, { css } from 'styled-components';
import BlueCross from '../../assets/images/icon-cross-blue.svg';
import Cross from '../../assets/images/icon-cross.svg';

const Span = styled.span`
  width: 30px;
  height: ${({ withLongerHeight }) => (withLongerHeight ? '82px' : '28px')};
  float: right;
  line-height: ${({ withLongerHeight }) =>
    withLongerHeight ? '82px' : '28px'};
  background: ${({ isDragging }) => (isDragging ? '#AED4FB' : '#F3F4F4')};
  text-align: center;
  cursor: pointer;
  &:after {
    display: inline-block;
    content: '';
    width: 8px;
    height: 8px;
    margin: auto;
    ${({ withLongerHeight }) => {
      if (withLongerHeight !== true) {
        return css`
          margin-top: -3px;
        `;
      }
    }}
    background-image: url(${({ isDragging }) =>
      isDragging ? BlueCross : Cross})
  }
`;

export default Span;
