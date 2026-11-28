import * as React from 'react';

import { useField, type InputProps } from '@strapi/admin/strapi-admin';
import { Field, Flex } from '@strapi/design-system';
import { useIntl, type MessageDescriptor, type PrimitiveType } from 'react-intl';

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

type ErrorMessage = string | (MessageDescriptor & { values?: Record<string, PrimitiveType> });

/**
 * Validation errors for a blocks field can target a nested node
 * (e.g. `blocks.0.children.1.url` for an invalid link). `useField` only
 * exposes errors set directly on the field path, so we look for the
 * first nested message to give the field an error state.
 */
const getFirstNestedError = (error: unknown): ErrorMessage | undefined => {
  if (typeof error === 'string') {
    return error;
  }

  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  if (!Array.isArray(error) && 'id' in error && 'defaultMessage' in error) {
    return error as Exclude<ErrorMessage, string>;
  }

  for (const value of Object.values(error)) {
    const nestedError = getFirstNestedError(value);

    if (nestedError) {
      return nestedError;
    }
  }

  return undefined;
};

const BlocksInput = React.forwardRef<{ focus: () => void }, BlocksInputProps>(
  (
    { label, name, required = false, hint, labelAction, livePreviewSync = false, ...editorProps },
    forwardedRef
  ) => {
    const id = React.useId();
    const field = useField<Schema.Attribute.BlocksValue>(name);
    const { formatMessage } = useIntl();

    const error = React.useMemo(() => {
      if (field.error) {
        return field.error;
      }

      const nestedError = getFirstNestedError(field.rawError);

      if (typeof nestedError === 'object') {
        const { values, ...message } = nestedError;

        return formatMessage(message, values);
      }

      return nestedError;
    }, [field.error, field.rawError, formatMessage]);

    return (
      <Field.Root
        id={id}
        name={name}
        hint={hint}
        error={error}
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
            error={error}
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
