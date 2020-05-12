/**
 *
 * StyledListRow
 *
 */

import styled from 'styled-components';
import { CustomRow as Row } from '@buffetjs/styles';
import { sizes } from 'strapi-helper-plugin';

const StyledListRow = styled(Row)`
  td {
    p {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &:first-of-type {
      width: 65px;
      padding-left: 30px;
    }
    &:nth-of-type(2) {
      max-width: 158px;
    }
    &:nth-of-type(3) {
      max-width: 300px;
    }
    &:nth-of-type(4) {
      min-width: 125px;
    }
    &:nth-of-type(5) {
      .popup-wrapper {
        width: 0;
      }
    }
    @media (min-width: ${sizes.wide}) {
      &:nth-of-type(3) {
        max-width: 400px;
      }
    }
  }
`;

export default StyledListRow;
