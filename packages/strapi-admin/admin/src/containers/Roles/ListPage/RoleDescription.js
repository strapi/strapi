import styled from 'styled-components';
import { Text } from '@buffetjs/core';

const RoleDescription = styled(Text)`
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 25rem;
  white-space: nowrap;
`;

export default RoleDescription;
