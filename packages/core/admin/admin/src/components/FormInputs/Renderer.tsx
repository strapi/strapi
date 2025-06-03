import { forwardRef, memo } from 'react';

import { TextInput, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { BooleanInput } from './Boolean';
import { CheckboxInput } from './Checkbox';
import { DateInput } from './Date';
import { DateTimeInput } from './DateTime';
import { EmailInput } from './Email';
import { EnumerationInput } from './Enumeration';
import { JsonInput } from './Json';
import { NumberInput } from './Number';
import { PasswordInput } from './Password';
import { StringInput } from './String';
import { TextareaInput } from './Textarea';
import { TimeInput } from './Time';

import type { InputProps } from '../Form';

/* -------------------------------------------------------------------------------------------------
 * InputRenderer
 * -----------------------------------------------------------------------------------------------*/

/**
 * @internal This needs to be tested before being exposed as a public API.
 * @experimental
 * @description A generic form renderer for Strapi forms. Similar to GenericInputs but with a different API.
 * The entire component is memoized to avoid re-renders in large forms.
 */
const InputRenderer = memo(
  forwardRef<any, InputProps>((props, forwardRef) => {
    switch (props.type) {
      case 'biginteger':
      case 'timestamp':
      case 'string':
      case 'uid':
        return <StringInput ref={forwardRef} {...props} />;
      case 'boolean':
        return <BooleanInput ref={forwardRef} {...props} />;
      case 'checkbox':
        return <CheckboxInput ref={forwardRef} {...props} />;
      case 'datetime':
        return <DateTimeInput ref={forwardRef} {...props} />;
      case 'date':
        return <DateInput ref={forwardRef} {...props} />;
      case 'decimal':
      case 'float':
      case 'integer':
        return <NumberInput ref={forwardRef} {...props} />;
      case 'json':
        return <JsonInput ref={forwardRef} {...props} />;
      case 'email':
        return <EmailInput ref={forwardRef} {...props} />;
      case 'enumeration':
        return <EnumerationInput ref={forwardRef} {...props} />;
      case 'password':
        return <PasswordInput ref={forwardRef} {...props} />;
      case 'text':
        return <TextareaInput ref={forwardRef} {...props} />;
      case 'time':
        return <TimeInput ref={forwardRef} {...props} />;
      default:
        // This is cast because this renderer tackles all the possibilities of the InputProps, but this is for runtime catches.
        return <NotSupportedField ref={forwardRef} {...(props as InputProps)} />;
    }
  })
);

const NotSupportedField = forwardRef<any, InputProps>(
  ({ label, hint, name, required, type, labelAction }, ref) => {
    const { error } = useField(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <TextInput
          ref={composedRefs}
          disabled
          placeholder={`Unsupported field type: ${type}`}
          required={required}
          type="text"
          value=""
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedInputRenderer = memo(InputRenderer);

export { MemoizedInputRenderer as InputRenderer };
