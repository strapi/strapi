import { forwardRef, memo, type ForwardedRef } from 'react';

import { TextInput, useComposedRefs, Field, type JSONInputRef } from '@strapi/design-system';

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
type InputRendererRef =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLDivElement
  | JSONInputRef;

const getTypedRef = <TElement,>(ref: ForwardedRef<InputRendererRef>) => {
  return ref as ForwardedRef<TElement>;
};

const InputRenderer = memo(
  forwardRef<InputRendererRef, InputProps>((props, forwardedRef) => {
    switch (props.type) {
      case 'biginteger':
      case 'timestamp':
      case 'string':
      case 'uid':
        return <StringInput ref={getTypedRef<HTMLInputElement>(forwardedRef)} {...props} />;
      case 'boolean':
        return <BooleanInput ref={getTypedRef<HTMLInputElement>(forwardedRef)} {...props} />;
      case 'checkbox':
        return <CheckboxInput ref={getTypedRef<HTMLButtonElement>(forwardedRef)} {...props} />;
      case 'datetime':
        return <DateTimeInput ref={getTypedRef<HTMLInputElement>(forwardedRef)} {...props} />;
      case 'date':
        return <DateInput ref={getTypedRef<HTMLInputElement>(forwardedRef)} {...props} />;
      case 'decimal':
      case 'float':
      case 'integer':
        return <NumberInput ref={getTypedRef<HTMLInputElement>(forwardedRef)} {...props} />;
      case 'json':
        return <JsonInput ref={getTypedRef<JSONInputRef>(forwardedRef)} {...props} />;
      case 'email':
        return <EmailInput ref={getTypedRef<HTMLInputElement>(forwardedRef)} {...props} />;
      case 'enumeration':
        return <EnumerationInput ref={getTypedRef<HTMLDivElement>(forwardedRef)} {...props} />;
      case 'password':
        return <PasswordInput ref={getTypedRef<HTMLInputElement>(forwardedRef)} {...props} />;
      case 'text':
        return <TextareaInput ref={getTypedRef<HTMLTextAreaElement>(forwardedRef)} {...props} />;
      case 'time':
        return <TimeInput ref={getTypedRef<HTMLInputElement>(forwardedRef)} {...props} />;
      default: {
        const notSupportedProps = props as InputProps;
        return (
          <NotSupportedField
            ref={getTypedRef<HTMLInputElement>(forwardedRef)}
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
  })
);

type NotSupportedFieldProps = Pick<
  InputProps,
  'hint' | 'label' | 'labelAction' | 'name' | 'required'
> & {
  type: string;
};

const NotSupportedField = forwardRef<HTMLInputElement, NotSupportedFieldProps>(
  ({ label, hint, name, required, type, labelAction }, ref) => {
    const { error } = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

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
