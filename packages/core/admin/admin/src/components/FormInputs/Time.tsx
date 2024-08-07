import { forwardRef, memo } from 'react';

import { TimePicker, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const TimeInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<string>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <TimePicker
          ref={composedRefs}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onChange={(time) => {
            field.onChange(name, `${time}:00.000`);
          }}
          onClear={() => field.onChange(name, undefined)}
          value={field.value ?? ''}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedTimeInput = memo(TimeInput);

export { MemoizedTimeInput as TimeInput };
