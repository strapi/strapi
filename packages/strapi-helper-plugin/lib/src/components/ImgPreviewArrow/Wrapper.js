import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  height: 32px;
  width: 28px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  text-align: center;
  color: #fff;
  cursor: pointer;
  z-index: 99;
  position: absolute;
  top: 56px;

  ${({ type }) => {
    if (type === 'left') {
      return css`
        left: 0;
        &:before {
          content: '\f104';
          vertical-align: middle;
          text-align: center;
          font-family: 'FontAwesome';
          font-size: 20px;
          font-weight: 800;
        }
      `;
    }

    return css`
      right: 0;
      &:before {
        content: '\f105';
        vertical-align: middle;
        text-align: center;
        font-family: 'FontAwesome';
        font-size: 20px;
        font-weight: 800;
      }
    `;
  }}
`;

export default Wrapper;
