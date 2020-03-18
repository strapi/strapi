import React from 'react';
import styled from 'styled-components';
import Text from '../Text';

const ErrorMessage = styled(props => <Text {...props} color="orange" fontSize="md" ellipsis />)`
  margin-top: 3px;
`;

export default ErrorMessage;
