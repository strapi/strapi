import { Flex, Tooltip, Typography, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getAttributeFlags } from './attributeFlagRegistry';

import type { AttributeFlag, AttributeLike } from './attributeFlagRegistry';

/**
 * The flag itself: its own colour, paled right down for the ground it sits on,
 * so a row of them reads as a row of labels rather than a row of alerts.
 */
const Pill = styled(Flex)<{ $tone: AttributeFlag['tone'] }>`
  border-radius: 1.6rem;
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  background: ${({ theme, $tone }) => theme.colors[`${$tone}100`]};

  svg path {
    fill: ${({ theme, $tone }) => theme.colors[`${$tone}600`]};
  }
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
        // The tooltip hands its trigger a ref, so the pill is what takes it.
        <Tooltip key={flag.id} label={formatMessage(flag.label)}>
          <Pill tag="span" alignItems="center" $tone={flag.tone}>
            {flag.Icon ? (
              <>
                <flag.Icon aria-hidden />
                <VisuallyHidden>{formatMessage(flag.short)}</VisuallyHidden>
              </>
            ) : (
              <Typography variant="sigma" textColor={`${flag.tone}600`}>
                {formatMessage(flag.short)}
              </Typography>
            )}
          </Pill>
        </Tooltip>
      ))}
    </Flex>
  );
};
