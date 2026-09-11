import { forwardRef, memo } from 'react';

import { SingleSelect, SingleSelectOption, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { EnumerationProps } from './types';

const EnumerationInput = forwardRef<HTMLDivElement, EnumerationProps>(
  ({ name, required, label, hint, labelAction, options = [], placeholder, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<string | number | null>(name);
    const fieldRef = useFocusInputField<HTMLDivElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <SingleSelect
          ref={composedRefs}
          onChange={(value) => {
            field.onChange(name, value === '' ? null : value);
          }}
          value={field.value}
          {...props}
        >
          {/**
           * The empty option is selected whenever the field has no value, so the select already
           * renders its label in the trigger. Forwarding `placeholder` to the select as well would
           * render both strings side by side, so it is used as this option's label instead.
           */}
          <SingleSelectOption value="" disabled={required} hidden={required}>
            {placeholder ??
              formatMessage({
                id: 'components.InputSelect.option.placeholder',
                defaultMessage: 'Choose here',
              })}
          </SingleSelectOption>
          {options.map(({ value, label, disabled, hidden }) => {
            return (
              <SingleSelectOption key={value} value={value} disabled={disabled} hidden={hidden}>
                {label ?? formatMessage({ id: value, defaultMessage: value })}
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

const MemoizedEnumerationInput = memo(EnumerationInput);

export { MemoizedEnumerationInput as EnumerationInput };
