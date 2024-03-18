import * as React from 'react';

import { Field, FieldError, FieldHint, FieldLabel, Flex } from '@strapi/design-system';

import { useField } from '../../../../../../components/Form';
import { InputProps } from '../../../../../../components/FormInputs/types';

import { BlocksEditor } from './BlocksEditor';

import type { Attribute } from '@strapi/types';

interface BlocksInputProps extends Omit<InputProps, 'type'> {
  type: Attribute.Blocks['type'];
}

const BlocksInput = React.forwardRef<{ focus: () => void }, BlocksInputProps>(
  ({ label, name, required = false, hint, ...editorProps }, forwardedRef) => {
    const id = React.useId();
    const field = useField(name);

    return (
      <Field id={id} name={name} hint={hint} error={field.error} required={required}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <FieldLabel>{label}</FieldLabel>
          <BlocksEditor
            name={name}
            error={field.error}
            ref={forwardedRef}
            value={field.value}
            onChange={field.onChange}
            ariaLabelId={id}
            {...editorProps}
          />
          <FieldHint />
          <FieldError />
        </Flex>
      </Field>
    );
  }
);

export { BlocksInput };
