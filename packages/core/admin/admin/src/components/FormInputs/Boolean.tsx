import { forwardRef } from 'react';

import { ToggleInput } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

const BooleanInput = forwardRef<HTMLInputElement, InputProps>(
  ({ disabled, label, hint, name, required }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<boolean | null>(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);

    return (
      <ToggleInput
        ref={composedRefs}
        checked={field.value === null ? null : field.value || false}
        disabled={disabled}
        hint={hint}
        // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
        label={label}
        error={field.error}
        /**
         * TODO: reintroduce labelActions
         */
        // labelAction={labelAction}
        name={name}
        offLabel={formatMessage({
          id: 'app.components.ToggleCheckbox.off-label',
          defaultMessage: 'False',
        })}
        onLabel={formatMessage({
          id: 'app.components.ToggleCheckbox.on-label',
          defaultMessage: 'True',
        })}
        onChange={field.onChange}
        required={required}
        onClear={() => {
          field.onChange(name, null);
        }}
        // TODO: re-introduce clear label
        // clearLabel={
        //   isNullable
        //     ? formatMessage({
        //         id: 'app.components.ToggleCheckbox.clear-label',
        //         defaultMessage: 'Clear',
        //       })
        //     : undefined
        // }
      />
    );
  }
);

export { BooleanInput };
