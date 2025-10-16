import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { Checkbox, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const CheckboxInput = React.forwardRef<HTMLButtonElement, InputProps>(
  ({ name, required, label, hint, type: _type, ...props }, ref) => {
    const field = useField<boolean>(name);
    const fieldRef = useFocusInputField<HTMLButtonElement>(name);
    const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();

    const composedRefs = useComposedRefs(ref, fieldRef);

    // Create a key that changes when locale changes to force re-render
    const localeKey = query?.plugins?.i18n?.locale || 'default';

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Checkbox
          key={`inputCheckbox-${name}-${localeKey}`}
          onCheckedChange={(checked) => field.onChange(name, !!checked)}
          ref={composedRefs}
          checked={field.value}
          {...props}
        >
          {label || props['aria-label']}
        </Checkbox>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedCheckboxInput = React.memo(CheckboxInput);

export { MemoizedCheckboxInput as CheckboxInput };
