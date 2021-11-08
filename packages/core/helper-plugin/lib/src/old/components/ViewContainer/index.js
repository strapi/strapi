/**
 *
 * ViewContainer
 *
 */

import styled from 'styled-components';

import sizes from '../../assets/styles/sizes';

const ViewContainer = styled.div`
  min-height: calc(100vh - ${sizes.header.height});
  .content {
    padding: 1.8rem 1.5rem;
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
      display: flex;
      justify-content: flex-end;
      width: 100%;
      padding-top: 3.1rem;
      > div {
        height: 30px;
        line-height: 30px;
        > div {
          padding: 0 15px;
        }
      }
    }
  }
`;

export default ViewContainer;
