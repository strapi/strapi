import { forwardRef } from 'react';

import {
  Toggle,
  useComposedRefs,
  Field,
  FieldLabel,
  FieldHint,
  FieldError,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const BooleanInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<boolean | null>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required} maxWidth="320px">
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <Toggle
          ref={composedRefs}
          checked={field.value === null ? null : field.value || false}
          error={field.error}
          offLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.off-label',
            defaultMessage: 'False',
          })}
          onLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.on-label',
            defaultMessage: 'True',
          })}
          onChange={field.onChange}
          {...props}
        />
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);

export { BooleanInput };
