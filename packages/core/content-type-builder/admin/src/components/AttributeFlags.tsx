import { Badge, Flex, Tooltip } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getAttributeFlags } from './attributeFlagRegistry';

import type { AttributeLike } from './attributeFlagRegistry';

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
        // The tooltip hands its trigger a ref, and a Badge is a plain
        // function component — the span is what takes it.
        <Tooltip key={flag.id} label={formatMessage(flag.label)}>
          <Flex tag="span">
            <Badge size="S" variant={flag.variant}>
              {formatMessage(flag.short)}
            </Badge>
          </Flex>
        </Tooltip>
      ))}
    </Flex>
  );
};
