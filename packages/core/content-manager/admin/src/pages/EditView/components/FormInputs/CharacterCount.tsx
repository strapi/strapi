import * as React from 'react';

import { useForm } from '@strapi/admin/strapi-admin';
import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getIn } from '../../../../utils/objects';

import type { Schema } from '@strapi/types';

const COUNTED_TYPES = ['string', 'text', 'richtext', 'email', 'uid'] as const;

type CountedAttribute = Extract<
  Schema.Attribute.AnyAttribute,
  { type: (typeof COUNTED_TYPES)[number] }
>;

const isCountedAttribute = (
  attribute: Schema.Attribute.AnyAttribute
): attribute is CountedAttribute =>
  (COUNTED_TYPES as readonly string[]).includes(attribute.type) && !('customField' in attribute);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

interface CharacterCountProps {
  name: string;
  attribute: CountedAttribute;
}

/**
 * Shows how many characters the field holds while the user types. It counts the raw value
 * (Markdown included for rich text) because that is what the minLength / maxLength validation checks.
 */
const CharacterCount = ({ name, attribute }: CharacterCountProps) => {
  const { formatMessage } = useIntl();
  // Select the length rather than the value so we only re-render when the count changes.
  const count = useForm('CharacterCount', (state) => {
    const value = getIn(state.values, name);

    return typeof value === 'string' ? value.length : 0;
  });

  const { minLength, maxLength } =
    'minLength' in attribute || 'maxLength' in attribute
      ? attribute
      : { minLength: undefined, maxLength: undefined };

  const isTooLong = typeof maxLength === 'number' && count > maxLength;
  const isTooShort = typeof minLength === 'number' && count > 0 && count < minLength;

  return (
    <Typography
      tag="span"
      variant="pi"
      textColor={isTooLong || isTooShort ? 'danger600' : 'neutral600'}
      data-testid={`character-count-${name}`}
    >
      {typeof maxLength === 'number'
        ? formatMessage(
            {
              id: 'content-manager.form.Input.characterCount.withMax',
              defaultMessage: '{count} / {max}',
            },
            { count, max: maxLength }
          )
        : formatMessage(
            {
              id: 'content-manager.form.Input.characterCount',
              defaultMessage: '{count, plural, one {# character} other {# characters}}',
            },
            { count }
          )}
    </Typography>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Placement
 * -----------------------------------------------------------------------------------------------*/

/**
 * Puts the count at the end of the first hint line, the one holding the min / max limits.
 */
const withCountInHint = (hint: React.ReactNode, props: CharacterCountProps) => (
  <>
    <HintCount>
      <CharacterCount {...props} />
    </HintCount>
    {hint}
  </>
);

interface CharacterCountFieldProps extends CharacterCountProps {
  children: React.ReactNode;
  hasError: boolean;
}

/**
 * The design system hides the hint while the field shows an error, which is when the count
 * helps the most. In that case we lay the count over the end of the error line instead.
 *
 * The wrapper is always rendered so the input does not remount when an error comes or goes.
 */
const CharacterCountField = ({ children, hasError, ...props }: CharacterCountFieldProps) => (
  <FieldWrapper $hasError={hasError}>
    {children}
    {hasError ? (
      <ErrorCount>
        <CharacterCount {...props} />
      </ErrorCount>
    ) : null}
  </FieldWrapper>
);

const HintCount = styled.span`
  float: inline-end;
  margin-inline-start: ${({ theme }) => theme.spaces[2]};
`;

// Keeps the error message clear of the count laid over the end of its line.
const ERROR_COUNT_SPACE = '10rem';

const FieldWrapper = styled.div<{ $hasError: boolean }>`
  position: relative;

  ${({ $hasError }) =>
    $hasError ? `[data-strapi-field-error] { padding-inline-end: ${ERROR_COUNT_SPACE}; }` : ''}
`;

const ErrorCount = styled.div`
  position: absolute;
  inset-inline-end: 0;
  bottom: 0;
`;

export {
  CharacterCount,
  CharacterCountField,
  isCountedAttribute,
  isNonEmptyString,
  withCountInHint,
};
export type { CharacterCountProps };
