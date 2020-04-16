import React from 'react';
import styled from 'styled-components';
import Text from '../Text';

const Title = styled(props => (
  <Text {...props} fontSize="md" fontWeight="bold" color="black" ellipsis />
))`
  width: 100%;
  margin-bottom: 4px;
  margin-top: 4px;
  margin-right: 5px;
`;

export default Title;
