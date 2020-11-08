import styled from 'styled-components';

const Wrapper = styled.div`
  padding-top: 5.5rem;

  .header {
    display: flex;
    justify-content: center;
    font-family: Lato;
    > div {
      padding-top: 2.5rem;
      > h4 {
        font-size: 24px;
        font-weight: 700;
        line-height: 24px;
        margin-bottom: 0;
      }
      > p {
        margin-top: -1px;
        font-size: 14px;
        color: #919bae;
      }
    }
  }

  .icoContainer {
    margin-right: 20px;
    padding-top: 0 !important;
    font-size: 4.2rem;
    color: #323740;
    line-height: 9.3rem;
  }
`;

export default Wrapper;
