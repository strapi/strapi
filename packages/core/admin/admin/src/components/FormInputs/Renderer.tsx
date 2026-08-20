import { memo } from 'react';

import { TextInput, Field } from '@strapi/design-system';

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
 * @internal
 * @experimental
 * @description A generic form renderer for Strapi forms. Similar to GenericInputs but with a different API. The entire component is memoized to avoid re-renders in large forms.
 */
const InputRenderer = memo((props: InputProps) => {
  switch (props.type) {
    case 'biginteger':
    case 'timestamp':
    case 'string':
    case 'uid':
      return <StringInput {...props} />;
    case 'boolean':
      return <BooleanInput {...props} />;
    case 'checkbox':
      return <CheckboxInput {...props} />;
    case 'datetime':
      return <DateTimeInput {...props} />;
    case 'date':
      return <DateInput {...props} />;
    case 'decimal':
    case 'float':
    case 'integer':
      return <NumberInput {...props} />;
    case 'json':
      return <JsonInput {...props} />;
    case 'email':
      return <EmailInput {...props} />;
    case 'enumeration':
      return <EnumerationInput {...props} />;
    case 'password':
      return <PasswordInput {...props} />;
    case 'text':
      return <TextareaInput {...props} />;
    case 'time':
      return <TimeInput {...props} />;
    default: {
      const notSupportedProps = props as InputProps;
      return (
        <NotSupportedField
          label={notSupportedProps.label}
          hint={notSupportedProps.hint}
          name={notSupportedProps.name}
          required={notSupportedProps.required}
          type={notSupportedProps.type}
          labelAction={notSupportedProps.labelAction}
        />
      );
    }
  }
});

type NotSupportedFieldProps = Pick<
  InputProps,
  'hint' | 'label' | 'labelAction' | 'name' | 'required'
> & {
  type: string;
};

const NotSupportedField = ({
  label,
  hint,
  name,
  required,
  type,
  labelAction,
}: NotSupportedFieldProps) => {
  const { error } = useField(name);
  const fieldRef = useFocusInputField<HTMLInputElement>(name);

  return (
    <Field.Root error={error} name={name} hint={hint} required={required}>
      <Field.Label action={labelAction}>{label}</Field.Label>
      <TextInput
        ref={fieldRef}
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
};

const MemoizedInputRenderer = memo(InputRenderer);

export { MemoizedInputRenderer as InputRenderer };
