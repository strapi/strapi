import * as React from 'react';

import {
  useStrapiApp,
  useForm,
  InputRenderer as FormInputRenderer,
  useField,
} from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';

import { SINGLE_TYPES } from '../../../constants/collections';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { type UseDocument } from '../../../hooks/useDocument';
import { useDocumentContext } from '../../../hooks/useDocumentContext';
import { useDocumentLayout } from '../../../hooks/useDocumentLayout';
import { useLazyComponents } from '../../../hooks/useLazyComponents';
import { useHasInputPopoverParent } from '../../../preview/components/InputPopover';
import { usePreviewInputManager } from '../../../preview/hooks/usePreviewInputManager';

import { BlocksInput } from './FormInputs/BlocksInput/BlocksInput';
import { ComponentInput } from './FormInputs/Component/Input';
import { DynamicZone, useDynamicZone } from './FormInputs/DynamicZone/Field';
import { NotAllowedInput } from './FormInputs/NotAllowed';
import { RelationsInput } from './FormInputs/Relations/Relations';
import { UIDInput } from './FormInputs/UID';
import { Wysiwyg } from './FormInputs/Wysiwyg/Field';

import type { EditFieldLayout } from '../../../hooks/useDocumentLayout';
import type { Schema } from '@strapi/types';
import type { DistributiveOmit } from 'react-redux';

type InputRendererProps = DistributiveOmit<EditFieldLayout, 'size'> & {
  document: ReturnType<UseDocument>;
};

/**
 * @internal
 *
 * @description An abstraction around the regular form input renderer designed
 * specifically to be used in the EditView of the content-manager this understands
 * the complete EditFieldLayout and will handle RBAC conditions and rendering CM specific
 * components such as Blocks / Relations.
 */
const InputRenderer = ({
  visible,
  hint: providedHint,
  document,
  ...inputProps
}: InputRendererProps) => {
  const localeKey = document?.document?.locale || 'default';
  const { currentDocumentMeta } = useDocumentContext('DynamicComponent');
  const {
    edit: { components },
  } = useDocumentLayout(currentDocumentMeta.model);

  const collectionType =
    document.schema?.kind === 'collectionType' ? 'collection-types' : 'single-types';

  const isInDynamicZone = useDynamicZone('isInDynamicZone', (state) => state.isInDynamicZone);
  const isInPreviewPopover = useHasInputPopoverParent();
  const shouldIgnorePermissions = isInDynamicZone || isInPreviewPopover;

  const isFormDisabled = useForm('InputRenderer', (state) => state.disabled);
  const canCreateFields = useDocumentRBAC('InputRenderer', (rbac) => rbac.canCreateFields);
  const canReadFields = useDocumentRBAC('InputRenderer', (rbac) => rbac.canReadFields);
  const canUpdateFields = useDocumentRBAC('InputRenderer', (rbac) => rbac.canUpdateFields);
  const canUserAction = useDocumentRBAC('InputRenderer', (rbac) => rbac.canUserAction);

  let idToCheck = document.document?.documentId;
  if (collectionType === SINGLE_TYPES) {
    idToCheck = document?.document?.documentId;
  }

  const editableFields = idToCheck ? canUpdateFields : canCreateFields;
  const readableFields = idToCheck ? canReadFields : canCreateFields;

  // Everything preview related
  const previewProps = usePreviewInputManager(inputProps.name, inputProps.attribute);
  const props = { ...inputProps, ...previewProps };

  /**
   * Component fields are always readable and editable,
   * however the fields within them may not be.
   */
  const canUserReadField = canUserAction(props.name, readableFields, props.type);
  const canUserEditField = canUserAction(props.name, editableFields, props.type);

  const fields = useStrapiApp('InputRenderer', (app) => app.fields);
  const { lazyComponentStore } = useLazyComponents(
    attributeHasCustomFieldProperty(props.attribute) ? [props.attribute.customField] : undefined
  );

  const hint = useFieldHint(providedHint, props.attribute);

  // We pass field in case of Custom Fields to keep backward compatibility
  const field = useField(props.name);

  if (!visible) {
    return null;
  }

  /**
   * If the user can't read the field then we don't want to ever render it.
   */
  if (!canUserReadField && !shouldIgnorePermissions) {
    return <NotAllowedInput hint={hint} {...props} />;
  }

  const fieldIsDisabled =
    (!canUserEditField && !shouldIgnorePermissions) || props.disabled || isFormDisabled;

  /**
   * Because a custom field has a unique prop but the type could be confused with either
   * the useField hook or the type of the field we need to handle it separately and first.
   */
  if (attributeHasCustomFieldProperty(props.attribute)) {
    const CustomInput = lazyComponentStore[props.attribute.customField];

    if (CustomInput) {
      return (
        <CustomInput
          {...props}
          {...field}
          // @ts-expect-error – TODO: fix this type error in the useLazyComponents hook.
          hint={hint}
          disabled={fieldIsDisabled}
        />
      );
    }

    return (
      <FormInputRenderer
        key={`input-${props.name}-${localeKey}`}
        {...props}
        {...previewProps}
        hint={hint}
        // @ts-expect-error – this workaround lets us display that the custom field is missing.
        type={props.attribute.customField}
        disabled={fieldIsDisabled}
      />
    );
  }

  /**
   * This is where we handle ONLY the fields from the `useLibrary` hook.
   */
  const addedInputTypes = Object.keys(fields);
  if (!attributeHasCustomFieldProperty(props.attribute) && addedInputTypes.includes(props.type)) {
    const CustomInput = fields[props.type];
    return (
      <CustomInput
        key={`input-${props.name}-${localeKey}`}
        {...props}
        // @ts-expect-error – TODO: fix this type error in the useLazyComponents hook.
        hint={hint}
        disabled={fieldIsDisabled}
      />
    );
  }

  /**
   * These include the content-manager specific fields, failing that we fall back
   * to the more generic form input renderer.
   */
  switch (props.type) {
    case 'blocks':
      return (
        <BlocksInput
          key={`input-${props.name}-${localeKey}`}
          {...props}
          hint={hint}
          type={props.type}
          disabled={fieldIsDisabled}
        />
      );
    case 'component':
      return (
        <ComponentInput
          key={`input-${props.name}-${localeKey}`}
          {...props}
          hint={hint}
          layout={components[props.attribute.component].layout}
          disabled={fieldIsDisabled}
        >
          {(componentInputProps) => (
            <InputRenderer
              key={`input-${componentInputProps.name}-${localeKey}`}
              {...componentInputProps}
            />
          )}
        </ComponentInput>
      );
    case 'dynamiczone':
      return (
        <DynamicZone
          key={`input-${props.name}-${localeKey}`}
          {...props}
          hint={hint}
          disabled={fieldIsDisabled}
        />
      );
    case 'relation':
      return (
        <RelationsInput
          key={`input-${props.name}-${localeKey}`}
          {...props}
          hint={hint}
          disabled={fieldIsDisabled}
        />
      );
    case 'richtext':
      return (
        <Wysiwyg
          key={`input-${props.name}-${localeKey}`}
          {...props}
          hint={hint}
          type={props.type}
          disabled={fieldIsDisabled}
        />
      );
    case 'uid':
      // These props are not needed for the generic form input renderer.
      const { unique: _uniqueUID, ...restUIDProps } = props;
      return (
        <UIDInput
          key={`input-${props.name}-${localeKey}`}
          {...restUIDProps}
          hint={hint}
          type={props.type}
          disabled={fieldIsDisabled}
        />
      );
    /**
     * Enumerations are a special case because they require options.
     */
    case 'enumeration':
      return (
        <FormInputRenderer
          key={`input-${props.name}-${localeKey}`}
          {...props}
          {...previewProps}
          hint={hint}
          options={props.attribute.enum.map((value) => ({ value }))}
          // @ts-expect-error – Temp workaround so we don't forget custom-fields don't work!
          type={props.customField ? 'custom-field' : props.type}
          disabled={fieldIsDisabled}
        />
      );
    default:
      // These props are not needed for the generic form input renderer.
      const { unique: _unique, mainField: _mainField, ...restProps } = props;
      return (
        <FormInputRenderer
          key={`input-${props.name}-${localeKey}`}
          {...restProps}
          {...previewProps}
          hint={hint}
          // @ts-expect-error – Temp workaround so we don't forget custom-fields don't work!
          type={props.customField ? 'custom-field' : props.type}
          disabled={fieldIsDisabled}
        />
      );
  }
};

const attributeHasCustomFieldProperty = (
  attribute: Schema.Attribute.AnyAttribute
): attribute is Schema.Attribute.AnyAttribute & Schema.Attribute.CustomField<string> =>
  'customField' in attribute && typeof attribute.customField === 'string';

const useFieldHint = (
  hint: React.ReactNode = undefined,
  attribute: Schema.Attribute.AnyAttribute
) => {
  const { formatMessage } = useIntl();

  const { maximum, minimum } = getMinMax(attribute);

  if (!maximum && !minimum) {
    return hint;
  }

  const units = ['string', 'uid', 'richtext', 'email', 'password', 'text'].includes(attribute.type)
    ? formatMessage(
        {
          id: 'content-manager.form.Input.hint.character.unit',
          defaultMessage: '{maxValue, plural, one { character} other { characters}}',
        },
        {
          maxValue: Math.max(minimum || 0, maximum || 0),
        }
      )
    : null;

  const hasMinAndMax = typeof minimum === 'number' && typeof maximum === 'number';

  return formatMessage(
    {
      id: 'content-manager.form.Input.hint.text',
      defaultMessage:
        '{min, select, undefined {} other {min. {min}}}{divider}{max, select, undefined {} other {max. {max}}}{unit}{br}{description}',
    },
    {
      min: minimum,
      max: maximum,
      description: hint,
      unit: units,
      divider: hasMinAndMax
        ? formatMessage({
            id: 'content-manager.form.Input.hint.minMaxDivider',
            defaultMessage: ' / ',
          })
        : null,
      br: <br />,
    }
  );
};

const getMinMax = (attribute: Schema.Attribute.AnyAttribute) => {
  if ('min' in attribute || 'max' in attribute) {
    return {
      maximum: !Number.isNaN(Number(attribute.max)) ? Number(attribute.max) : undefined,
      minimum: !Number.isNaN(Number(attribute.min)) ? Number(attribute.min) : undefined,
    };
  } else if ('maxLength' in attribute || 'minLength' in attribute) {
    return { maximum: attribute.maxLength, minimum: attribute.minLength };
  } else {
    return { maximum: undefined, minimum: undefined };
  }
};

const MemoizedInputRenderer = React.memo(InputRenderer);

export type { InputRendererProps };
export { MemoizedInputRenderer as InputRenderer, useFieldHint };
