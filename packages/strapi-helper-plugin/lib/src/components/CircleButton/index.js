import styled, { css } from 'styled-components';

const CircleButton = styled.button`
  display: flex;
  justify-content: center;
  height: 20px;
  width: 20px;
  margin: 8px 5px 0px 0px;
  border-radius: 50%;
  border: 1px solid #e3e9f3;
  cursor: pointer;
  &:focus {
    outline: 0;
  }
  ${({ isRemoveButton }) => {
    if (isRemoveButton) {
      return css`
        &:after {
          content: '\f068';
          font-family: FontAwesome;
          font-size: 12px;
          line-height: 18px;
          color: #007eff;
        }
      `;
    }
    return css`
      &:after {
        content: '\f067';
        font-family: FontAwesome;
        font-size: 12px;
        line-height: 18px;
        color: #007eff;
      }
    `;
  }}
`;

export default CircleButton;
