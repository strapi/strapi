import { forwardRef, memo } from 'react';

import { TextInput } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useComposedRefs } from '../../content-manager/utils/refs';
import { useField } from '../Form';

import { BooleanInput } from './Boolean';
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
import { EnumerationProps, InputProps } from './types';

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
  forwardRef<any, InputProps | EnumerationProps>((props, forwardRef) => {
    switch (props.type) {
      case 'timestamp':
      case 'biginteger':
      case 'string':
        return <StringInput ref={forwardRef} {...props} />;
      case 'boolean':
        return <BooleanInput ref={forwardRef} {...props} />;
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

const NotSupportedField = forwardRef<any, InputProps>((props, ref) => {
  const { error } = useField(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs(ref, fieldRef);

  return (
    <TextInput
      ref={composedRefs}
      disabled
      error={error}
      label={props.label}
      id={props.name}
      hint={props.hint}
      name={props.name}
      placeholder={`Unsupported field type: ${props.type}`}
      required={props.required}
      type="text"
      value=""
    />
  );
});

export { InputRenderer };
