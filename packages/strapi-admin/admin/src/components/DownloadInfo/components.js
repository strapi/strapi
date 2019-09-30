import styled from 'styled-components';

const Wrapper = styled.div`
  width: 372px;
  height: 159px;
  border-radius: 2px;
  background-color: #fff;
`;

const Content = styled.div`
  padding-top: 3rem;
  text-align: center;
  font-family: Lato;
  font-size: 1.3rem;
  > img {
    width: 2.5rem;
    margin-bottom: 1.5rem;
  }

  > div {
    padding-top: 9px;
    line-height: 18px;
    > span:first-child {
      color: #333740;
      font-size: 16px;
      font-weight: 600;
    }

    > span {
      color: #787e8f;
      font-size: 13px;
    }
  }
`;

export { Content, Wrapper };
