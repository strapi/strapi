import styled, { css } from 'styled-components';

const Label = styled.label`
  cursor: pointer;
  > input {
    display: none;
  }
  &:before {
    content: '';
    position: absolute;
    left: 15px;
    ${props => (props.isAll ? 'top: 5px;' : 'top: 19px;')}
    width: 14px;
    height: 14px;
    border: 1px solid rgba(16, 22, 34, 0.15);
    background-color: #fdfdfd;
    border-radius: 3px;
  }

  ${({ shouldDisplaySomeChecked }) => {
    if (shouldDisplaySomeChecked) {
      return css`
        &:after {
          content: '\f068';
          position: absolute;
          top: 5px;
          left: 18px;
          font-size: 10px;
          font-family: 'FontAwesome';
          font-weight: 100;
          color: #1c5de7;
        }
      `;
    }
  }}

  ${({ shouldDisplayAllChecked }) => {
    if (shouldDisplayAllChecked) {
      return css`
        &:after {
          content: '\f00c';
          position: absolute;
          top: 5px;
          left: 17px;
          font-size: 10px;
          font-family: 'FontAwesome';
          font-weight: 100;
          color: #1c5de7;
          transition: all 0.2s;
        }
      `;
    }
  }}

  ${({ isChecked }) => {
    if (isChecked) {
      return css`
        &:after {
          content: '\f00c';
          position: absolute;
          top: 0px;
          left: 17px;
          font-size: 10px;
          font-family: 'FontAwesome';
          font-weight: 100;
          color: #1c5de7;
          transition: all 0.2s;
        }
      `;
    }
  }}
`;

export { Label };
