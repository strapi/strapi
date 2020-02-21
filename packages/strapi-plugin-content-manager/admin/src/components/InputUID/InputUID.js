import styled, { css } from 'styled-components';
import { InputText } from '@buffetjs/core';

const InputUID = styled(InputText)`
  width: 100%;
  ${({ error }) =>
    error &&
    css`
      > input {
        border-color: red;
      }
    `}
`;

export default InputUID;
