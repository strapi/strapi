import styled from 'styled-components';

const Ul = styled.ul`
  padding: 0 15px;
  background-color: #fff;
  list-style: none;
  font-size: 13px;
  > li {
    label {
      flex-shrink: 1;
      width: fit-content !important;
      cursor: pointer;
    }

    .check-wrapper {
      z-index: 9;
      > input {
        z-index: 1;
      }
    }
    .chevron {
      margin: auto;

      font-size: 11px;
      color: #919bae;
    }
  }
  .li-multi-menu {
    margin-bottom: -3px;
  }
  .li {
    line-height: 27px;
    position: relative;
    > p {
      margin: 0;
    }

    &:hover {
      > p::after {
        content: attr(datadescr);
        position: absolute;
        left: 0;
        color: #007eff;
        font-weight: 700;
        z-index: 100;
      }
      &::after {
        content: '';
        position: absolute;
        z-index: 1;
        top: 0;
        left: -30px;
        right: -30px;
        bottom: 0;
        background-color: #e6f0fb;
      }
    }
  }
`;

export default Ul;
