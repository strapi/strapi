import { Flex, Tooltip, Typography, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getAttributeFlags } from './attributeFlagRegistry';
import { Pill } from './Pill';

import type { AttributeLike } from './attributeFlagRegistry';

/**
 * A flag that does not apply to this field still holds its place.
 *
 * Every row shows the same flags in the same order, so "required" is in the
 * same column on the row above and the row below. Packing only what applies
 * would put internationalization where required sits one row up, and a list of
 * thirty-five fields becomes unreadable for the sake of a little width.
 */
const Absent = styled.span`
  visibility: hidden;
`;

/**
 * What is true of a field, said in words next to it.
 *
 * "Required" had a red asterisk after the name, which said the same thing in a
 * way that only worked if you already knew the convention — so it is one of
 * these now instead, beside the options that had no affordance at all. The
 * list itself comes from the registry (see `attributeFlagRegistry.ts`).
 */
export const AttributeFlags = ({
  attribute,
  siblings,
}: {
  attribute: AttributeLike;
  /**
   * The fields this one is listed with. A column is only worth its width if
   * something in the list is in it: a flag no field here carries — i18n among
   * a component's fields, unique among a list with nothing unique — is left
   * out rather than reserved empty on every row.
   */
  siblings: AttributeLike[];
}) => {
  const { formatMessage } = useIntl();

  const flags = getAttributeFlags().filter((flag) => siblings.some((field) => flag.applies(field)));

  if (flags.length === 0) {
    return null;
  }

  return (
    <Flex gap={1}>
      {flags.map((flag) => {
        const pill = (
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
        );

        if (!flag.applies(attribute)) {
          return (
            <Absent key={flag.id} aria-hidden>
              {pill}
            </Absent>
          );
        }

        // The tooltip hands its trigger a ref, so the pill is what takes it.
        return (
          <Tooltip key={flag.id} label={formatMessage(flag.label)}>
            {pill}
          </Tooltip>
        );
      })}
    </Flex>
  );
};
