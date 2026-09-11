import { Flex, Tooltip, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../utils/getTrad';

import type { MessageDescriptor } from 'react-intl';

const Pill = styled(Flex)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 0 ${({ theme }) => theme.spaces[2]};
  height: 2rem;
`;

interface Flag {
  id: string;
  label: MessageDescriptor;
  /** What the pill says — short enough to read at a glance across a column. */
  short: MessageDescriptor;
  color: 'danger600' | 'primary600' | 'neutral600' | 'secondary600';
}

const FLAGS: Record<string, Flag> = {
  required: {
    id: 'required',
    label: {
      id: getTrad('attribute.flag.required.hint'),
      defaultMessage: 'This field must be filled in',
    },
    short: { id: getTrad('attribute.flag.required'), defaultMessage: 'Required' },
    color: 'danger600',
  },
  unique: {
    id: 'unique',
    label: {
      id: getTrad('attribute.flag.unique.hint'),
      defaultMessage: 'No two entries may share a value',
    },
    short: { id: getTrad('attribute.flag.unique'), defaultMessage: 'Unique' },
    color: 'primary600',
  },
  private: {
    id: 'private',
    label: {
      id: getTrad('attribute.flag.private.hint'),
      defaultMessage: 'Hidden from the public API',
    },
    short: { id: getTrad('attribute.flag.private'), defaultMessage: 'Private' },
    color: 'neutral600',
  },
  localized: {
    id: 'localized',
    label: {
      id: getTrad('attribute.flag.localized.hint'),
      defaultMessage: 'Translated per locale',
    },
    short: { id: getTrad('attribute.flag.localized'), defaultMessage: 'i18n' },
    color: 'secondary600',
  },
};

interface AttributeLike {
  required?: boolean;
  unique?: boolean;
  private?: boolean;
  pluginOptions?: { i18n?: { localized?: boolean } };
}

/**
 * What is true of a field, said in words next to it.
 *
 * These four live in the field's own settings modal, which means the only way
 * to know whether a field is unique, private or translated has been to open it
 * — one field at a time, down a list of thirty-five. "Required" had a red
 * asterisk after the name, which said the same thing in a way that only worked
 * if you already knew the convention, so it is one of these now instead.
 */
export const AttributeFlags = ({ attribute }: { attribute: AttributeLike }) => {
  const { formatMessage } = useIntl();

  const active = [
    attribute.required ? FLAGS.required : null,
    attribute.unique ? FLAGS.unique : null,
    attribute.private ? FLAGS.private : null,
    attribute.pluginOptions?.i18n?.localized ? FLAGS.localized : null,
  ].filter((flag): flag is Flag => flag !== null);

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
