import { ReactNode } from 'react';

import {
  useStrapiApp,
  useForm,
  InputRenderer as FormInputRenderer,
} from '@strapi/admin/strapi-admin';
import { Alert, FieldLabel, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useDocumentRBAC } from '../../features/DocumentRBAC';
import { useDoc } from '../../hooks/useDocument';
import { useLazyComponents } from '../../hooks/useLazyComponents';
import { BlocksInput } from '../../pages/EditView/components/FormInputs/BlocksInput/BlocksInput';
import { ComponentInput } from '../../pages/EditView/components/FormInputs/Component/Input';
import {
  DynamicZone,
  useDynamicZone,
} from '../../pages/EditView/components/FormInputs/DynamicZone/Field';
import { NotAllowedInput } from '../../pages/EditView/components/FormInputs/NotAllowed';
import { RelationsInput } from '../../pages/EditView/components/FormInputs/Relations';
import { UIDInput } from '../../pages/EditView/components/FormInputs/UID';
import { Wysiwyg } from '../../pages/EditView/components/FormInputs/Wysiwyg/Field';
import { useHistoryContext } from '../pages/History';

import type { EditFieldLayout } from '../../hooks/useDocumentLayout';
import type { Schema } from '@strapi/types';
import type { DistributiveOmit } from 'react-redux';

const StyledAlert = styled(Alert)`
  button {
    display: none;
  }
`;

type VersionInputRendererProps = DistributiveOmit<EditFieldLayout, 'size'> & {
  /**
   * In the context of content history, deleted fields need to ignore RBAC
   * @default false
   */
  shouldIgnoreRBAC?: boolean;
};

// The renderers for these types will be added in future PRs, they need special handling
const UNSUPPORTED_TYPES = ['media', 'relation'];

/**
 * @internal
 *
 * @description An abstraction around the regular form input renderer designed
 * specifically to be used on the History page in the content-manager. It understands how to render
 * specific inputs within the context of a history version (i.e. relations, media, ignored RBAC, etc...)
 */
const VersionInputRenderer = ({
  visible,
  hint: providedHint,
  shouldIgnoreRBAC = false,
  ...props
}: VersionInputRendererProps) => {
  const { formatMessage } = useIntl();
  const { version } = useHistoryContext('VersionContent', (state) => ({
    version: state.selectedVersion,
  }));
  const { id } = useDoc();
  const isFormDisabled = useForm('InputRenderer', (state) => state.disabled);

  const isInDynamicZone = useDynamicZone('isInDynamicZone', (state) => state.isInDynamicZone);

  const canCreateFields = useDocumentRBAC('InputRenderer', (rbac) => rbac.canCreateFields);
  const canReadFields = useDocumentRBAC('InputRenderer', (rbac) => rbac.canReadFields);
  const canUpdateFields = useDocumentRBAC('InputRenderer', (rbac) => rbac.canUpdateFields);
  const canUserAction = useDocumentRBAC('InputRenderer', (rbac) => rbac.canUserAction);

  const editableFields = id ? canUpdateFields : canCreateFields;
  const readableFields = id ? canReadFields : canCreateFields;
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

  if (!visible) {
    return null;
  }

  /**
   * Don't render the field if the user can't read it.
   */
  if (!shouldIgnoreRBAC && !canUserReadField && !isInDynamicZone) {
    return <NotAllowedInput hint={hint} {...props} />;
  }

  const fieldIsDisabled =
    (!canUserEditField && !isInDynamicZone) || props.disabled || isFormDisabled;

  if (UNSUPPORTED_TYPES.includes(props.type)) {
    return <Typography>TODO: support {props.type}</Typography>;
  }

  /**
   * Attributes found on the current content-type schema cannot be restored. We handle
   * this by displaying a warning alert to the user instead of the input for that field type.
   */
  const addedAttributes = version.meta.unknownAttributes.added;
  if (Object.keys(addedAttributes).includes(props.name)) {
    return (
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <FieldLabel>{props.label}</FieldLabel>
        <StyledAlert
          width="100%"
          closeLabel="Close"
          onClose={() => {}}
          variant="warning"
          title={formatMessage({
            id: 'content-manager.history.content.new-field.title',
            defaultMessage: 'New field',
          })}
        >
          {formatMessage({
            id: 'content-manager.history.content.new-field.message',
            defaultMessage:
              "This field didn't exist when this version was saved. If you restore this version, it will be empty.",
          })}
        </StyledAlert>
      </Flex>
    );
  }

  /**
   * Because a custom field has a unique prop but the type could be confused with either
   * the useField hook or the type of the field we need to handle it separately and first.
   */
  if (attributeHasCustomFieldProperty(props.attribute)) {
    const CustomInput = lazyComponentStore[props.attribute.customField];

    if (CustomInput) {
      // @ts-expect-error – TODO: fix this type error in the useLazyComponents hook.
      return <CustomInput {...props} hint={hint} disabled={fieldIsDisabled} />;
    }

    return (
      <FormInputRenderer
        {...props}
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
    // @ts-expect-error – TODO: fix this type error in the useLibrary hook.
    return <CustomInput {...props} hint={hint} disabled={fieldIsDisabled} />;
  }

  /**
   * These include the content-manager specific fields, failing that we fall back
   * to the more generic form input renderer.
   */
  switch (props.type) {
    case 'blocks':
      return <BlocksInput {...props} hint={hint} type={props.type} disabled={fieldIsDisabled} />;
    case 'component':
      return <ComponentInput {...props} hint={hint} disabled={fieldIsDisabled} />;
    case 'dynamiczone':
      return <DynamicZone {...props} hint={hint} disabled={fieldIsDisabled} />;
    case 'relation':
      return <RelationsInput {...props} hint={hint} disabled={fieldIsDisabled} />;
    case 'richtext':
      return <Wysiwyg {...props} hint={hint} type={props.type} disabled={fieldIsDisabled} />;
    case 'uid':
      return <UIDInput {...props} hint={hint} type={props.type} disabled={fieldIsDisabled} />;
    /**
     * Enumerations are a special case because they require options.
     */
    case 'enumeration':
      return (
        <FormInputRenderer
          {...props}
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
          {...restProps}
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

const useFieldHint = (hint: ReactNode = undefined, attribute: Schema.Attribute.AnyAttribute) => {
  const { formatMessage } = useIntl();

  const { maximum, minimum } = getMinMax(attribute);

  if (!maximum && !minimum) {
    return hint;
  }

  const units = !['biginteger', 'integer', 'number'].includes(attribute.type)
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

export type { VersionInputRendererProps };
export { VersionInputRenderer };
