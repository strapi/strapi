import styled, { css } from 'styled-components';
import { colors, sizes } from '@buffetjs/styles';

/* eslint-disable indent */
const Wrapper = styled.div`
  position: relative;
  padding-bottom: ${sizes.margin * 2.7}px;
  label {
    display: block;
    margin-bottom: 1rem;
  }
  > p {
    width: 100%;
    padding-top: 10px;
    font-size: 13px;
    line-height: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: -8px;
  }
  input[type='checkbox'] {
    margin-bottom: 13px;
  }
  ${({ error }) =>
    !!error &&
    css`
      input,
      textarea,
      select {
        border-color: ${colors.darkOrange};
      }
    `}
`;

export default Wrapper;
