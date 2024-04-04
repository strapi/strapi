import { forwardRef } from 'react';

import { TimePicker, useComposedRefs } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const TimeInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { formatMessage } = useIntl();
  const field = useField<string>(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <TimePicker
      ref={composedRefs}
      clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
      error={field.error}
      id={props.name}
      onChange={(time) => {
        field.onChange(props.name, time);
      }}
      onClear={() => field.onChange(props.name, undefined)}
      value={field.value ?? ''}
      {...props}
    />
  );
});

export { TimeInput };
