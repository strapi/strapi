import styled from 'styled-components';

import colors from '../../assets/styles/colors';

const Wrapper = styled.div`
  margin-bottom: 24px;
  button {
    outline: 0;
  }
  .list-header {
    color: ${colors.leftMenu.darkGrey};
    > div {
      position: relative;
    }
    // Title
    h3 {
      margin-bottom: 12px;
      padding-right: 20px;
      padding-top: 2px;
      font-family: Lato;
      font-size: 1.1rem;
      line-height: normal;
      letter-spacing: 0.1rem;
      font-weight: bold;
      text-transform: uppercase;
      span:last-of-type {
        margin-top: 2px;
        padding: 1px 3px;
        height: 14px;
        min-width: 14px;
        display: inline-block;
        background-color: ${colors.leftMenu.lightGrey};
        text-align: center;
      }
      & + button {
        position: absolute;
        top: 2px;
        right: 0;
        padding: 2px 0 0px 5px;
        line-height: 11px;
        i {
          font-size: 11px;
        }
      }
    }
    // Search
    .search-wrapper {
      margin-bottom: 16px;
      &::after {
        display: block;
        content: '';
        height: 2px;
        width: calc(100% - 20px);
        background: ${colors.leftMenu.lightGrey};
      }
      > i {
        position: absolute;
        bottom: 6px;
        left: 0;
        font-size: 11px;
      }
      button {
        position: absolute;
        top: 0;
        right: 0;
        padding: 5px 0 0px 5px;
        line-height: 11px;
        i {
          font-size: 11px;
        }
      }
    }
  }
  ul {
    list-style: none;
    li {
      a {
        text-transform: capitalize;
      }
    }
  }
`;

export default Wrapper;
