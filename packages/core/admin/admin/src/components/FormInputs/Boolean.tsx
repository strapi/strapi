import { forwardRef, memo } from 'react';

import { Toggle, useComposedRefs, Field, Flex } from '@strapi/design-system';
// import { Toggle, useComposedRefs, Field, Button } from '@strapi/design-system';
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

    const handleToggleChange = () => {
      let newValue;
      if (field.value === null || field.value === undefined) {
        newValue = true;
      } else {
        newValue = !field.value;
      }
      field.onChange(name, newValue);
    };

    const handleSetFalseClick = () => {
      field.onChange(name, false);
    };

    const handleSetTrueClick = () => {
      field.onChange(name, true);
    };

    // The key change is here: We check if the cleared value matches the initial value.
    const handleClear = () => {
      // The `useField` hook provides an `initialValue` property.
      // We check if the field's initial value was `undefined` or `null`.
      // If it was, we set the value back to that specific initial value.
      const initialValue = field.initialValue;
      if (initialValue === null || initialValue === undefined) {
        field.onChange(name, initialValue);
      } else {
        // If the initial value was a boolean, we set it back to null to "clear" it.
        field.onChange(name, null);
      }
    };

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required} maxWidth="320px">
        <Flex justifyContent={'space-between'}>
          <Field.Label action={labelAction}>{label}</Field.Label>
          {(field.value === true || field.value === false) && (
            <div
              onClick={handleClear}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer', fontSize: '1.2rem' }}
            >
              <a href="#" style={{ textDecoration: 'none', color: '#7b79ff' }}>
                {formatMessage({
                  id: 'app.components.Boolean.clear',
                  defaultMessage: 'Clear',
                })}
              </a>
            </div>
          )}
        </Flex>
        {/* <Field.Label action={labelAction}>{label}</Field.Label>
        {(field.value === true || field.value === false) && (
          <Button variant="tertiary" size="S" onClick={() => field.onChange(name, null)}>
            {formatMessage({
              id: 'app.components.Boolean.clear',
              defaultMessage: 'Clear',
            })}
          </Button>
        )} */}
        <Toggle
          ref={composedRefs}
          checked={field.value === false ? false : field.value === true ? true : null}
          offLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.off-label',
            defaultMessage: 'False',
          })}
          onLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.on-label',
            defaultMessage: 'True',
          })}
          onChange={handleToggleChange}
          {...props}
        />

        {(field.value === null || field.value === undefined) && (
          <div style={{ position: 'relative', top: '-36px', width: '100%', height: '36px' }}>
            <div
              style={{
                position: 'absolute',
                left: '0',
                top: '0',
                width: '50%',
                height: '100%',
                cursor: 'pointer',
              }}
              onClick={handleSetFalseClick}
            />
            <div
              style={{
                position: 'absolute',
                right: '0',
                top: '0',
                width: '50%',
                height: '100%',
                cursor: 'pointer',
              }}
              onClick={handleSetTrueClick}
            />
          </div>
        )}

        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedBooleanInput = memo(BooleanInput);

export { MemoizedBooleanInput as BooleanInput };
