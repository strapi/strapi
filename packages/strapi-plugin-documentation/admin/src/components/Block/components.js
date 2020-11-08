import styled from 'styled-components';

const Wrapper = styled.div`
  margin-bottom: 28px;
  background: #ffffff;
  padding: 22px 28px 18px;
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
  -webkit-font-smoothing: antialiased;
`;

const Title = styled.div`
  padding-top: 0px;
  line-height: 18px;
  > span {
    font-weight: 600;
    color: #333740;
    font-size: 18px;
  }
  > p {
    color: #787e8f;
    font-size: 13px;
  }
`;

export { Wrapper, Title };
