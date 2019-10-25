import styled from 'styled-components';

const Wrapper = styled.div`
  margin-top: 9px;
  padding: 0;
  padding-bottom: 7px;

  > div:first-child {
    margin: 0;
  }

  .list {
    width: 100%;
    padding: 0 !important;
    list-style: none;
    margin-bottom: 0;
    > li:nth-child(2) {
      height: 57px;
      > div {
        line-height: 54px !important;
      }
    }
    > li {
      width: 100%;
      margin-top: 0;
    }

    > li:last-child {
      > div {
        border-bottom: 0 !important;
      }
      box-shadow: 0 2px 4px #e3e9f3;
    }
  }
`;

export default Wrapper;
