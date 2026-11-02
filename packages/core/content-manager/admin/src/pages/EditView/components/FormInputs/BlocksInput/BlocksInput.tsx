import * as React from 'react';

import { useField, type InputProps } from '@strapi/admin/strapi-admin';
import { Field, Flex } from '@strapi/design-system';

import { BlocksEditor } from './BlocksEditor';

import type { Schema } from '@strapi/types';

interface BlocksInputProps extends Omit<InputProps, 'type'> {
  labelAction?: React.ReactNode;
  type: Schema.Attribute.Blocks['type'];
  autoFocus?: boolean;
  livePreviewSync?: boolean;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  onBlur?: React.FocusEventHandler<HTMLElement>;
  blockIndex?: number | null;
}

const BlocksInput = React.forwardRef<{ focus: () => void }, BlocksInputProps>(
  (
    { label, name, required = false, hint, labelAction, livePreviewSync = false, ...editorProps },
    forwardedRef
  ) => {
    const id = React.useId();
    const field = useField<Schema.Attribute.BlocksValue>(name);

    return (
      <Field.Root
        id={id}
        name={name}
        hint={hint}
        error={field.error}
        required={required}
        minHeight={livePreviewSync ? 0 : undefined}
      >
        <Flex
          direction="column"
          alignItems="stretch"
          gap={1}
          minHeight={livePreviewSync ? 0 : undefined}
        >
          <Field.Label action={labelAction}>{label}</Field.Label>
          <BlocksEditor
            name={name}
            error={field.error}
            ref={forwardedRef}
            value={field.value ?? []}
            onChange={field.onChange}
            ariaLabelId={id}
            livePreviewSync={livePreviewSync}
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
