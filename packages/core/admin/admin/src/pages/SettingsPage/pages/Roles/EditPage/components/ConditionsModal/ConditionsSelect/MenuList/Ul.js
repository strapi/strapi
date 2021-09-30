/* eslint-disable indent */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import styled from 'styled-components';

const Ul = styled.ul`
  max-height: 150px;
  font-size: 13px;
  padding: 0 15px;
  margin-bottom: 0px;
  list-style: none;
  background-color: #fff;
  > li {
    label {
      flex-shrink: 1;
      width: fit-content !important;
      cursor: pointer;
      margin-bottom: 0px;
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
        color: ${({ theme }) => theme.main.colors.mediumBlue};
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
        background-color: ${({ theme }) => theme.main.colors.lightBlue};
      }
    }
  }
  ${({ disabled, theme }) =>
    disabled &&
    `
    label {
      cursor: not-allowed !important;
    }
    input[type='checkbox'] {
      cursor: not-allowed;
      &:after {
        cursor: not-allowed;
        color: ${theme.main.colors.grey};
      }
    }
  `}
`;

export default Ul;
