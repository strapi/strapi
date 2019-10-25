import styled from 'styled-components';

const Wrapper = styled.div`
  width: 100%;
  padding-top: 6px;
  margin-bottom: -13px;

  .detailBanner {
    display: flex;
    justify-content: space-between;
    line-height: 23px;
    -webkit-font-smoothing: antialiased;

    > div:first-child {
      display: flex;
      > div:nth-child(2) {
        color: #333740;
        font-size: 13px;
        font-weight: 400;
      }
    }
  }

  .externalLink {
    color: #333740;
    text-decoration: none;

    &:hover,
    &:active {
      color: #333740;
      text-decoration: none;
    }

    > i {
      margin-right: 7px;
      color: #b3b5b9;
    }
  }

  .removeContainer {
    color: #ff3000;
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
  }
`;

export default Wrapper;
