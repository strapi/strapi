import { Button } from '@buffetjs/core';
import styled from 'styled-components';

export const StyledButton = styled(Button)`
  width: 100%;
`;

export const FormWrapper = styled.form`
  min-width: 330px;
  max-width: 400px;
  padding: 13px 15px;

  & > * + * {
    margin-top: 11px;
  }
`;

export const DateWrapper = styled.div`
  display: ${({ type }) => (type === 'datetime' ? 'flex' : 'block')};

  input {
    width: 100%;
  }
`;
