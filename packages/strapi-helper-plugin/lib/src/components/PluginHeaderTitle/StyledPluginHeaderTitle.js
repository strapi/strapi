/**
 *
 * StyledPluginHeaderTitle
 *
 */

import styled from 'styled-components';

const StyledPluginHeaderTitle = styled.div`
  .header-title {
    position: relative;
    h1 {
      position: relative;
      width: fit-content;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 2.4rem;
      font-weight: 600;
      margin-top: 0.7rem;
      margin-bottom: 1px;
      text-transform: capitalize;
      padding-right: 18px;
    }
    i {
      font-size: 14px;
      position: absolute;
      right: 0;
      top: 0;
      margin-top: 9px;
      color: rgba(16, 22, 34, 0.35);
      cursor: pointer;
    }
  }
  .header-subtitle {
    width: 100%;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1.3rem;
    font-weight: 400;
    color: #787e8f;
  }
`;

export default StyledPluginHeaderTitle;
