/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';
import { colors, sizes } from '@buffetjs/styles';

const Wrapper = styled.div`
  position: relative;
  padding-bottom: ${sizes.margin * 2.3}px;
  label {
    display: block;
    margin-bottom: 1rem;
  }
  > p {
    width 100%;
    margin-bottom: -8px;
    padding-top: 10px;
    font-size: 13px;
    line-height: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hasError {
    input {
      border-color: ${colors.darkOrange};
    }
  }
`;

export default Wrapper;
