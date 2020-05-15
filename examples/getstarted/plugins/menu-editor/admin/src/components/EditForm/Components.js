import styled from 'styled-components';

const Separator = styled.div`
  box-sizing: border-box;
  height: 1px;
  width: 100%;
  margin-top: 1.4rem;
  margin-bottom: 2.1rem;
  background: #f6f6f6;
`;

const Wrapper = styled.div`
  background: #ffffff;
  padding: 45px 30px 22px 30px;
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
  &.load-container {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    min-height: 209px;
    padding-top: 88px;
  }
`;

export { Separator, Wrapper };
