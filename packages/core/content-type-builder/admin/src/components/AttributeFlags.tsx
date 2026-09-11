import { Flex, Tooltip, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getAttributeFlags } from './attributeFlagRegistry';

import type { AttributeLike } from './attributeFlagRegistry';

const Pill = styled(Flex)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 0 ${({ theme }) => theme.spaces[2]};
  height: 2rem;
`;

/**
 * What is true of a field, said in words next to it.
 *
 * "Required" had a red asterisk after the name, which said the same thing in a
 * way that only worked if you already knew the convention — so it is one of
 * these now instead, beside the options that had no affordance at all. The
 * list itself comes from the registry (see `attributeFlagRegistry.ts`).
 */
export const AttributeFlags = ({ attribute }: { attribute: AttributeLike }) => {
  const { formatMessage } = useIntl();

  const active = getAttributeFlags().filter((flag) => flag.applies(attribute));

  if (active.length === 0) {
    return null;
  }

  return (
    <Flex gap={1} wrap="wrap">
      {active.map((flag) => (
        <Tooltip key={flag.id} label={formatMessage(flag.label)}>
          <Pill alignItems="center" tag="span">
            <Typography variant="pi" textColor={flag.color}>
              {formatMessage(flag.short)}
            </Typography>
          </Pill>
        </Tooltip>
      ))}
    </Flex>
  );
};
