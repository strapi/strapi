import styled from 'styled-components';
import { Button, Text as TextBase } from '@buffetjs/core';

const Text = styled(TextBase)`
  width: 100%;
  padding: 0 15px 17px 15px;
`;

const AlignedButton = styled(Button)`
  height: 34px;
  padding-top: 3px;
  margin: 29px 15px 0 15px;
  min-width: unset;
`;

export { Text, AlignedButton };
