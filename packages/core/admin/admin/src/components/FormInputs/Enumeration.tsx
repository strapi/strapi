import * as React from 'react';

import { SingleSelect, SingleSelectOption, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useLocaleKey } from '../../hooks/useLocaleKey';
import { useField } from '../Form';

import { EnumerationProps } from './types';

const EnumerationInput = React.forwardRef<HTMLDivElement, EnumerationProps>(
  ({ name, required, label, hint, labelAction, options = [], ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLDivElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    const localeKey = useLocaleKey();

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <SingleSelect
          key={`inputEnumeration-${name}-${localeKey}`}
          ref={composedRefs}
          onChange={(value) => {
            field.onChange(name, value);
          }}
          value={field.value}
          {...props}
        >
          <SingleSelectOption value="" disabled={required} hidden={required}>
            {formatMessage({
              id: 'components.InputSelect.option.placeholder',
              defaultMessage: 'Choose here',
            })}
          </SingleSelectOption>
          {options.map(({ value, label, disabled, hidden }) => {
            return (
              <SingleSelectOption key={value} value={value} disabled={disabled} hidden={hidden}>
                {label ?? value}
              </SingleSelectOption>
            );
          })}
        </SingleSelect>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedEnumerationInput = React.memo(EnumerationInput);

export { MemoizedEnumerationInput as EnumerationInput };
