import styled from 'styled-components';

const Wrapper = styled.div`
  margin-bottom: 35px;
  background: #ffffff;
  padding: 22px 28px 18px;
  padding-bottom: 13px;
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
  -webkit-font-smoothing: antialiased;
`;

const Sub = styled.div`
  padding-top: 0px;
  line-height: 18px;
  > p:first-child {
    margin-bottom: 1px;
    font-weight: 700;
    color: #333740;
    font-size: 1.8rem;
  }
  > p {
    color: #787e8f;
    font-size: 13px;
  }
`;

export { Wrapper, Sub };
