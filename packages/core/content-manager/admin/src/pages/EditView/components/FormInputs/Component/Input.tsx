import * as React from 'react';

import { InputProps, useField } from '@strapi/admin/strapi-admin';
import { Button, Field, Flex, IconButton } from '@strapi/design-system';
import { Duplicate, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { COLLECTION_TYPES } from '../../../../../constants/collections';
import { useDocumentContext } from '../../../../../hooks/useDocumentContext';
import { EditFieldLayout } from '../../../../../hooks/useDocumentLayout';
import { getTranslation } from '../../../../../utils/translations';
import { type AnyData, transformDocument } from '../../../utils/data';
import { createDefaultForm } from '../../../utils/forms';
import { type InputRendererProps } from '../../InputRenderer';

import { ComponentCopyModal } from './ComponentCopyModal';
import { Initializer } from './Initializer';
import { NonRepeatableComponent } from './NonRepeatable';
import { RepeatableComponent } from './Repeatable';
import { isComponentBlank } from './utils/componentCopy';

interface ComponentInputProps
  extends Omit<Extract<EditFieldLayout, { type: 'component' }>, 'size' | 'hint'>,
    Pick<InputProps, 'hint'> {
  labelAction?: React.ReactNode;
  children: (props: InputRendererProps) => React.ReactNode;
  /**
   * We need layout to come from the props, and not via a hook, because Content History needs
   * a way to modify the normal component layout to add hidden fields.
   */
  layout: ReadonlyArray<ReadonlyArray<EditFieldLayout>>;
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
  const field = useField<AnyData | AnyData[] | null>(name);
  const [isCopyModalOpen, setIsCopyModalOpen] = React.useState(false);

  const {
    currentDocumentMeta,
    currentDocument: { components },
  } = useDocumentContext('ComponentInput');
  const canCopyFromExisting = currentDocumentMeta.collectionType === COLLECTION_TYPES;

  const hasComponent = !attribute.repeatable && field.value !== undefined && field.value !== null;
  const showResetComponent = hasComponent && !disabled;
  /**
   * A component that was just added is blank: copying into it fills it. Once it holds content,
   * copying into it replaces that content and the user is warned.
   */
  const hasContent =
    hasComponent && !isComponentBlank(field.value, attribute.component, components);

  const handleInitialisationClick = () => {
    const schema = components[attribute.component];
    const form = createDefaultForm(schema, components);
    const data = transformDocument(schema, components)(form);

    field.onChange(name, data);
  };

  /**
   * The copy replaces the component in place. It has no id, so the inputs holding server data for
   * the replaced component (relations) drop it, see `RelationsField`.
   */
  const handleCopyComponent = ([componentData]: AnyData[]) => {
    field.onChange(name, componentData);

    return true;
  };

  return (
    <Field.Root error={field.error} required={required}>
      <Flex justifyContent="space-between" alignItems="center" gap={2}>
        <Field.Label action={labelAction}>
          {label}
          {attribute.repeatable && (
            <>&nbsp;({Array.isArray(field.value) ? field.value.length : 0})</>
          )}
        </Field.Label>

        {showResetComponent && (
          <Flex gap={1}>
            {canCopyFromExisting && (
              <Button
                variant="ghost"
                size="S"
                startIcon={<Duplicate />}
                onClick={() => setIsCopyModalOpen(true)}
              >
                {hasContent
                  ? formatMessage({
                      id: getTranslation('components.Component.replace-content'),
                      defaultMessage: 'Replace content…',
                    })
                  : formatMessage({
                      id: getTranslation('components.AddComponentMenu.copy'),
                      defaultMessage: 'Use existing content…',
                    })}
              </Button>
            )}
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
          </Flex>
        )}
      </Flex>
      {/**
       * if the field isn't repeatable then we display a button to start the field
       * TODO: should this just live in the `NonRepeatableComponent`?
       */}
      {!attribute.repeatable && !field.value && (
        <Initializer
          disabled={disabled}
          name={name}
          onClick={handleInitialisationClick}
          onCopyClick={canCopyFromExisting ? () => setIsCopyModalOpen(true) : undefined}
        />
      )}
      {!attribute.repeatable && isCopyModalOpen && (
        <ComponentCopyModal
          componentUid={attribute.component}
          fieldLabel={label}
          mode="component"
          onClose={() => setIsCopyModalOpen(false)}
          onInsert={handleCopyComponent}
          replacesContent={hasContent}
          selection="single"
          sourceFieldName={name}
        />
      )}
      {!attribute.repeatable && field.value ? (
        <NonRepeatableComponent attribute={attribute} name={name} disabled={disabled} {...props}>
          {props.children}
        </NonRepeatableComponent>
      ) : null}
      {attribute.repeatable && (
        <RepeatableComponent
          attribute={attribute}
          label={label}
          name={name}
          disabled={disabled}
          {...props}
        >
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
