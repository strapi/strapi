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
    // handling the toggle change manually when the toggle value is null or undefined
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

    // Checking if the cleared value matches the initial value.
    const handleClear = () => {
      // Using `initialValue` property provided by the `useField` hook.
      // Checking if the field's initial value was `undefined` or `null`,
      // if so, setting the value back to the specific initial value
      const initialValue = field.initialValue;
      if (initialValue === null || initialValue === undefined) {
        field.onChange(name, initialValue);
      } else {
        // setting it back to null, if the initial value is a boolean,
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
        {/* Alternate version of the clear button */}
        {/* <Field.Label action={labelAction}>{label}</Field.Label>
        {(field.value === true || field.value === false) && (
          <Button variant="tertiary" size="S" onClick={handleClear}>
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
        {/* Invisible Click Areas for Null/Undefined State */}
        {(field.value === null || field.value === undefined) && (
          <div style={{ position: 'relative', top: '-42px', width: '100%', height: '36px' }}>
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
