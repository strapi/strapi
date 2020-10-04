import styled from 'styled-components';
import { InputText } from '@buffetjs/core';
import { colors } from '@buffetjs/styles';

/* eslint-disable indent */
const InputUID = styled(InputText)`
  width: 100%;

  ${({ containsEndAdornment }) =>
    containsEndAdornment &&
    `
      > input {
        padding-right: calc(40px + 1rem);
      }
    `}

  ${({ error }) =>
    error &&
    `
      > input {
        border-color: ${colors.darkOrange};
      }
    `}
`;

export default InputUID;
