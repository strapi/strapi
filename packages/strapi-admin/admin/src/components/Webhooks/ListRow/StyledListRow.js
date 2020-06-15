/**
 *
 * StyledListRow
 *
 */

import styled from 'styled-components';
import { CustomRow as Row } from '@buffetjs/styles';
import { sizes } from 'strapi-helper-plugin';

const StyledListRow = styled(Row)`
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
  .checkboxWrapper {
    width: 55px;
    padding-left: 30px;
    > div {
      height: 16px;
    }
  }
  .nameWrapper {
    max-width: 158px;
  }
  .urlWrapper {
    max-width: 300px;
  }

  .switchWrapper {
    min-width: 125px;
  }

  @media (min-width: ${sizes.wide}) {
    .urlWrapper {
      max-width: 400px;
    }
  }
  td {
    p {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

StyledListRow.defaultProps = {
  disabled: true,
};

export default StyledListRow;
