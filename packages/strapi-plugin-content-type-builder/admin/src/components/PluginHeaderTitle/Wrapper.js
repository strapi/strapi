/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  padding-top: 0.7rem;
  h1 {
    position: relative;
    width: fit-content;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 2.4rem;
    font-weight: 600;
    margin-bottom: 1px;
    text-transform: capitalize;
    padding-right: 18px;
  }
  i {
    position: absolute;
    right: 0;
    top: 0;
    margin-top: 9px;
    font-size: 14px;
    color: rgba(16, 22, 34, 0.35);
    cursor: pointer;
  }
`;

export default Wrapper;
