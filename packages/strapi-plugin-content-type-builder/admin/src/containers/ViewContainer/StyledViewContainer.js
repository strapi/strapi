/**
 *
 * StyledViewContainer
 *
 */

import styled from 'styled-components';

import { sizes } from 'strapi-helper-plugin';

const StyledViewContainer = styled.div`
  min-height: calc(100vh - ${sizes.header.height});
  .components-container {
    padding: 1.8rem 1.5rem;
    div div:not(.list-button) {
      button {
        top: 1.8rem;
      }
    }
    > div:not(:first-of-type):not(:last-of-type) {
      > div:first-of-type {
        padding-bottom: 1rem;
      }
    }
    .list-header-title {
      & + p {
        margin-bottom: 0.7rem;
      }
      p {
        width: fit-content;
        display: inline-block;
        margin-bottom: 0;
      }
    }
    .trash-btn-wrapper {
      position: relative;
      width: 100%;
      padding-top: 3.4rem;
      display: flex;
      justify-content: flex-end;
    }
  }
`;

export default StyledViewContainer;
