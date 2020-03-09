import React from 'react';
import styled from 'styled-components';
import Text from '../Text';

const Title = styled(props => <Text {...props} color="black" />)`
  width: 100%;
  margin-bottom: 4px;
  margin-top: 5px;
`;

export default Title;
