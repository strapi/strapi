import * as React from 'react';

import { InputProps, useField } from '@strapi/admin/strapi-admin';
import { Field, Flex, IconButton } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useDoc } from '../../../../../hooks/useDocument';
import { EditFieldLayout } from '../../../../../hooks/useDocumentLayout';
import { getTranslation } from '../../../../../utils/translations';
import { transformDocument } from '../../../utils/data';
import { createDefaultForm } from '../../../utils/forms';
import { type InputRendererProps } from '../../InputRenderer';

import { Initializer } from './Initializer';
import { NonRepeatableComponent } from './NonRepeatable';
import { RepeatableComponent } from './Repeatable';

interface ComponentInputProps
  extends Omit<Extract<EditFieldLayout, { type: 'component' }>, 'size' | 'hint'>,
    Pick<InputProps, 'hint'> {
  labelAction?: React.ReactNode;
  children: (props: InputRendererProps) => React.ReactNode;
  /**
   * We need layout to come from the props, and not via a hook, because Content History needs
   * a way to modify the normal component layout to add hidden fields.
   */
  layout: EditFieldLayout[][];
}

const ComponentInput = ({
  label,
  required,
  name,
  attribute,
  disabled,
  labelAction,
  ...props
}: ComponentInputProps) => {
  const { formatMessage } = useIntl();
  const field = useField(name);

  const showResetComponent = !attribute.repeatable && field.value && !disabled;

  const { components } = useDoc();

  const handleInitialisationClick = () => {
    const schema = components[attribute.component];
    const form = createDefaultForm(schema, components);
    const data = transformDocument(schema, components)(form);

    field.onChange(name, data);
  };

  return (
    <Field.Root error={field.error} required={required}>
      <Flex justifyContent="space-between">
        <Field.Label action={labelAction}>
          {label}
          {attribute.repeatable && (
            <>&nbsp;({Array.isArray(field.value) ? field.value.length : 0})</>
          )}
        </Field.Label>

        {showResetComponent && (
          <IconButton
            label={formatMessage({
              id: getTranslation('components.reset-entry'),
              defaultMessage: 'Reset Entry',
            })}
            variant="ghost"
            onClick={() => {
              field.onChange(name, null);
            }}
          >
            <Trash />
          </IconButton>
        )}
      </Flex>
      {/**
       * if the field isn't repeatable then we display a button to start the field
       * TODO: should this just live in the `NonRepeatableComponent`?
       */}
      {!attribute.repeatable && !field.value && (
        <Initializer disabled={disabled} name={name} onClick={handleInitialisationClick} />
      )}
      {!attribute.repeatable && field.value ? (
        <NonRepeatableComponent attribute={attribute} name={name} disabled={disabled} {...props}>
          {props.children}
        </NonRepeatableComponent>
      ) : null}
      {attribute.repeatable && (
        <RepeatableComponent attribute={attribute} name={name} disabled={disabled} {...props}>
          {props.children}
        </RepeatableComponent>
      )}
      <Field.Error />
    </Field.Root>
  );
};

const MemoizedComponentInput = React.memo(ComponentInput);

export { MemoizedComponentInput as ComponentInput };
export type { ComponentInputProps };
