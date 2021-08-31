import React from 'react';
import styled from 'styled-components';
import { Text } from '@buffetjs/core';

const ErrorMessage = styled(props => <Text {...props} color="orange" fontSize="md" ellipsis />)`
  margin-top: 3px;
`;

export default ErrorMessage;
