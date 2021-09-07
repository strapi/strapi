import styled from 'styled-components';

import colors from '../../assets/styles/colors';

const Wrapper = styled.div`
  margin-bottom: 24px;
  button {
    outline: 0;
  }

  .count-info {
    position: relative;
    display: inline-block;
    height: 14px;
    min-width: 14px;
    margin-top: 2px;
    padding: 1px 3px;
    text-align: center;
    border-radius: 2px;
    &:before {
      content: attr(datadescr);
      position: absolute;
      top: 1px;
      height: 14px;
      min-width: 14px;
      padding: 0px 3px;
      background-color: ${colors.leftMenu.lightGrey};
      border-radius: 2px;
    }
  }
  .list-header {
    color: ${colors.leftMenu.darkGrey};
    > div {
      position: relative;
    }
    // Title
    h3 {
      margin-bottom: 10px;
      padding-right: 20px;
      padding-top: 2px;
      font-family: Lato;
      font-size: 1.1rem;
      line-height: normal;
      letter-spacing: 0.1rem;
      font-weight: bold;
      text-transform: uppercase;
      & + button {
        position: absolute;
        top: 2px;
        right: 0;
        padding: 2px 0 0px 5px;
        line-height: 11px;
        i,
        svg {
          font-size: 11px;
        }
      }
    }
    // Search
    .search-wrapper {
      margin-bottom: 7px;
      &::after {
        display: block;
        content: '';
        height: 2px;
        width: calc(100% - 20px);
        background: ${colors.leftMenu.lightGrey};
      }
      > svg {
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
        i,
        svg {
          font-size: 11px;
        }
      }
    }
  }
  ul {
    list-style: none;
    padding-top: 2px;
    li {
      a {
        text-transform: capitalize;
      }
    }
  }
`;

export default Wrapper;
