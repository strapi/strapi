import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 30px;
  width: 100%;
  padding: 0 5px;
  ${({ isGroup }) => {
    if (isGroup) {
      return css`
        height: 36px;
        border: 1px solid #e3e9f3;
        border-bottom: 0;
      `;
    }
  }}
  border-radius: 2px;
  > div {
    width: 100%;
    height: 2px;
    background: #007eff;
  }
`;

export default Wrapper;
