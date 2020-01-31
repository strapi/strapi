import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 30px;
  width: 100%;
  padding: 0 5px;
  ${({ isComponent }) => {
    if (isComponent) {
      return css`
        height: 34px;
        padding: 0;
      `;
    }

    return '';
  }}
  border-radius: 2px;
  > div {
    width: 100%;
    height: 2px;
    background: #007eff;
  }
`;

export default Wrapper;
