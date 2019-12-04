/**
 *
 * Dropdown
 *
 */

import styled from 'styled-components';

const Dropdown = styled.div`
  line-height: normal;
  button {
    position: relative;
    padding: 0 10px 1px 15px;
    margin-bottom: 18px;
    font-weight: 600;
    text-transform: capitalize;
    &::before {
      content: '\f0da';
      position: absolute;
      left: 0;
      top: 5px;
      font-family: 'FontAwesome';
      font-size: 1rem;
    }
    &.is-open::before {
      content: '\f0d7';
      top: 4px;
    }
  }
  ul {
    padding-left: 10px;
  }
  .collapse {
    margin-bottom: 20px;
  }
  &:last-of-type {
    margin-bottom: 0;
    button {
      margin-bottom: 8px;
      &.is-open {
        margin-bottom: 18px;
      }
    }
    .collapse {
      margin-bottom: 0px;
    }
  }
  .editable {
    display: flex;
    width: 100%;
    justify-content: space-between;

    > svg {
      margin-top: auto;
      margin-bottom: auto;
      color: #b3b5b9;
      font-size: 12px;
      z-index: -1;
    }

    &:hover {
      > svg {
        z-index: 1;
      }
    }
  }
`;

export default Dropdown;
