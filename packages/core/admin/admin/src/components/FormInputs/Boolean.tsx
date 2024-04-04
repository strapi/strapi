import { forwardRef } from 'react';

import { ToggleInput, useComposedRefs } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const BooleanInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { formatMessage } = useIntl();
  const field = useField<boolean | null>(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <ToggleInput
      ref={composedRefs}
      checked={field.value === null ? null : field.value || false}
      error={field.error}
      /**
       * TODO: reintroduce labelActions
       */
      // labelAction={labelAction}
      offLabel={formatMessage({
        id: 'app.components.ToggleCheckbox.off-label',
        defaultMessage: 'False',
      })}
      onLabel={formatMessage({
        id: 'app.components.ToggleCheckbox.on-label',
        defaultMessage: 'True',
      })}
      onChange={field.onChange}
      onClear={() => {
        field.onChange(props.name, null);
      }}
      {...props}
    />
  );
});

export { BooleanInput };
