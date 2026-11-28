import * as React from 'react';

import { Flex, Td, Th, Tr, Typography } from '@strapi/design-system';
import { styled } from 'styled-components';

/** Height of a default button: the title row is at least this tall so the action centres on it. */
const HEADER_ROW_MIN_HEIGHT = '3.2rem';

interface MfaBlockHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The block's single action, shown on the right and aligned with the title. */
  action?: React.ReactNode;
}

/**
 * The header every block of the profile's Two-factor section shares (Trusted devices, Passkeys,
 * Recent security events): title and description on the left, the block's action on the right,
 * vertically centred on the title row.
 */
const MfaBlockHeader = ({ title, description, action }: MfaBlockHeaderProps) => {
  const titleId = React.useId();

  return (
    <Flex
      role="group"
      aria-labelledby={titleId}
      justifyContent="space-between"
      alignItems="flex-start"
      gap={4}
      wrap="wrap"
    >
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Flex alignItems="center" minHeight={HEADER_ROW_MIN_HEIGHT}>
          <Typography id={titleId} variant="delta" tag="h3">
            {title}
          </Typography>
        </Flex>
        {description ? (
          <Typography variant="pi" textColor="neutral600">
            {description}
          </Typography>
        ) : null}
      </Flex>
      {action ? (
        <Flex alignItems="center" minHeight={HEADER_ROW_MIN_HEIGHT}>
          {action}
        </Flex>
      ) : null}
    </Flex>
  );
};

/**
 * A table row whose `data-row-action` children are hidden until the row is hovered or holds
 * keyboard focus, and always shown on touch devices. Opacity rather than `display: none`, so the
 * button stays in the tab order and `:focus-within` can reveal it.
 */
const ActionRow = styled(Tr)`
  [data-row-action] {
    opacity: 0;
  }

  &:hover [data-row-action],
  &:focus-within [data-row-action] {
    opacity: 1;
  }

  @media (hover: none) {
    [data-row-action] {
      opacity: 1;
    }
  }
`;

/** Fixed width so revealing the button never shifts the table's columns. */
const ACTIONS_COLUMN_WIDTH = '8rem';

const ActionsTh = styled(Th)`
  width: ${ACTIONS_COLUMN_WIDTH};
`;

const ActionsTd = styled(Td)`
  width: ${ACTIONS_COLUMN_WIDTH};
`;

export { MfaBlockHeader, ActionRow, ActionsTh, ActionsTd };
