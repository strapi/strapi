import styled from 'styled-components';
import { Label, Text } from '@buffetjs/core';

export const Title = styled(Text)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.main.colors.grey};
`;

export const ProfilePageLabel = styled(Label)`
  margin-bottom: 1rem;
`;
