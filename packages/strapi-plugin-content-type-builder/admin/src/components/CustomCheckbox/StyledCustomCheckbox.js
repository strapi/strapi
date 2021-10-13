/**
 *
 * StyledCustomCheckbox
 *
 */

import styled from 'styled-components';

const StyledCustomCheckbox = styled.div`
  width: 100%;
  padding: 0;
  padding-bottom: 15px;

  .no-label {
    padding-top: 7px;
    > div:first-child {
      padding-bottom: 13px;
    }
    label {
      display: none;
    }
  }
`;

export default StyledCustomCheckbox;
