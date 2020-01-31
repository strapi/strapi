/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';
import { colors } from 'strapi-helper-plugin';

/* eslint-disable indent */

const Wrapper = styled.tr`
  background-color: transparent;
  p {
    margin-bottom: 0;
  }
  img {
    width: 35px;
  }
  button {
    cursor: pointer;
  }
  td:first-of-type {
    padding-left: 3rem;
    position: relative;
    img {
      width: 35px;
      height: 20px;
      position: absolute;
      top: calc(50% - 10px);
      left: 3rem;
    }
    img + p {
      width: 237px;
      padding-left: calc(3rem + 35px);
    }
  }
  td:nth-child(2) {
    ${({ loopNumber }) => {
      return `
        width: calc(25rem - ${5 * loopNumber}rem);
      `;
    }}
    p {
      font-weight: 500;
      text-transform: capitalize;
    }
  }
  td:last-child {
    text-align: right;
    &:not(:first-of-type) {
      font-size: 10px;
    }
  }
  &.relation-row {
    background: linear-gradient(
      135deg,
      rgba(28, 93, 231, 0.05),
      rgba(239, 243, 253, 0)
    );
  }
  &.clickable {
    &:hover {
      cursor: pointer;
      background-color: ${colors.grey};
      & + tr {
        &::before {
          background-color: transparent;
        }
      }
    }
  }
  .button-container {
    svg {
      color: #333740;
    }
  }
`;

export default Wrapper;
