import { Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

export type PillTone =
  | 'danger'
  | 'primary'
  | 'neutral'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'alternative';

/**
 * A label in its own colour, paled right down for the ground it sits on, so a
 * row of them reads as a row of labels rather than a row of alerts. Shared by
 * a field's flags and by the status of a schema or a field, which sit side by
 * side and would look like two conventions otherwise.
 */
export const Pill = styled(Flex)<{ $tone: PillTone }>`
  border-radius: 1.6rem;
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  background: ${({ theme, $tone }) => theme.colors[`${$tone}100`]};

  svg,
  svg * {
    fill: ${({ theme, $tone }) => theme.colors[`${$tone}600`]};
  }
`;
