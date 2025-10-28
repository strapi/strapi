import * as React from 'react';

import { useField, type InputProps } from '@strapi/admin/strapi-admin';
import { Field, Flex } from '@strapi/design-system';

import { BlocksEditor } from './BlocksEditor';

import type { Schema } from '@strapi/types';

interface BlocksInputProps extends Omit<InputProps, 'type'> {
  labelAction?: React.ReactNode;
  type: Schema.Attribute.Blocks['type'];
}

const BlocksInput = React.forwardRef<{ focus: () => void }, BlocksInputProps>(
  ({ label, name, required = false, hint, labelAction, ...editorProps }, forwardedRef) => {
    const id = React.useId();
    const field = useField(name);

    return (
      <Field.Root id={id} name={name} hint={hint} error={field.error} required={required}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Field.Label action={labelAction}>{label}</Field.Label>
          <BlocksEditor
            name={name}
            error={field.error}
            ref={forwardedRef}
            value={field.value}
            onChange={field.onChange}
            ariaLabelId={id}
            {...editorProps}
          />
          <Field.Hint />
          <Field.Error />
        </Flex>
      </Field.Root>
    );
  }
);

const MemoizedBlocksInput = React.memo(BlocksInput);

export { MemoizedBlocksInput as BlocksInput };
