import styled from 'styled-components';
import { Label, Text } from '@buffetjs/core';

export const Title = styled(Text)`
  text-transform: uppercase;
  font-family: 'Lato';
  font-weight: bold;
  font-size: ${({ theme }) => theme.main.sizes.fonts.xs};
  color: ${({ theme }) => theme.main.colors.grey};
`;

export const ProfilePageLabel = styled(Label)`
  margin-bottom: 1rem;
`;
