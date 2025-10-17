import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { Toggle, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const BooleanInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<boolean | null>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();

    const composedRefs = useComposedRefs(ref, fieldRef);

    // Create a key that changes when locale changes to force re-render
    const localeKey = query?.plugins?.i18n?.locale || 'default';

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required} maxWidth="320px">
        <Field.Label action={labelAction}>{label}</Field.Label>
        <Toggle
          key={`inputBoolean-${name}-${localeKey}`}
          ref={composedRefs}
          checked={field.value === null ? null : field.value || false}
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
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedBooleanInput = React.memo(BooleanInput);

export { MemoizedBooleanInput as BooleanInput };
