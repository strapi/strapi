/**
 *
 * List
 *
 */

import styled from 'styled-components';
import colors from '../../styles/colors';
import sizes from '../../styles/sizes';

const List = styled.div`
  position: relative;
  width: 100%;
  overflow-x: scroll;
  border-radius: 3px;
  background: white;
  i,
  svg {
    display: inline-block;
    text-rendering: auto;
    font-weight: 600;
    color: ${colors.blueTxt};
    font-style: initial;
    font-size: 13px;
    &.link-icon {
      font-weight: 100;
    }
  }
  table {
    border-collapse: collapse;
    width: 100%;
    min-width: 500px;
    font-family: 'Lato';
  }
  thead {
    tr {
      height: 3rem;
      line-height: 0.1rem;
      font-weight: bold;
      text-transform: capitalize;
      td {
        background-color: ${colors.greyHeader};
      }
    }
  }
  td {
    padding: 0.75em;
    vertical-align: middle;
    font-size: 1.3rem;
    line-height: 1.8rem;
    &:first-of-type {
      padding-left: calc(3rem + 0.75em);
    }
    &:last-of-type {
      padding-right: calc(3rem + 0.75em);
    }
  }
  tbody {
    color: ${colors.blueTxt};
    tr {
      height: 5.4rem;
      &::before {
        content: '-';
        display: inline-block;
        position: absolute;
        left: ${sizes.margin * 3}px;
        width: calc(100% - ${sizes.margin * 6}px);
        height: 1px;
        margin-top: -${sizes.margin * 0.1}px;
        line-height: 1.1em;
        color: transparent;
        background-color: transparent;
      }
      &:not(:first-of-type)::before {
        background-color: rgba(14, 22, 34, 0.04);
      }
      &:first-of-type::before {
        height: 0;
      }
    }
  }
  @media (min-width: ${sizes.tablet}) {
    width: 100%;
    overflow-x: auto;
  }
`;

export default List;
