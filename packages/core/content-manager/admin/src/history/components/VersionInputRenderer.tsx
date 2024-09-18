import * as React from 'react';

import {
  useStrapiApp,
  useForm,
  InputRenderer as FormInputRenderer,
  useField,
  Form,
} from '@strapi/admin/strapi-admin';
import { Alert, Box, Field, Flex, Link, Tooltip, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { COLLECTION_TYPES } from '../../constants/collections';
import { useDocumentRBAC } from '../../features/DocumentRBAC';
import { useDoc } from '../../hooks/useDocument';
import { useDocLayout } from '../../hooks/useDocumentLayout';
import { useLazyComponents } from '../../hooks/useLazyComponents';
import { useTypedSelector } from '../../modules/hooks';
import { DocumentStatus } from '../../pages/EditView/components/DocumentStatus';
import { BlocksInput } from '../../pages/EditView/components/FormInputs/BlocksInput/BlocksInput';
import { ComponentInput } from '../../pages/EditView/components/FormInputs/Component/Input';
import {
  DynamicZone,
  useDynamicZone,
} from '../../pages/EditView/components/FormInputs/DynamicZone/Field';
import { NotAllowedInput } from '../../pages/EditView/components/FormInputs/NotAllowed';
import { UIDInput } from '../../pages/EditView/components/FormInputs/UID';
import { Wysiwyg } from '../../pages/EditView/components/FormInputs/Wysiwyg/Field';
import { useFieldHint } from '../../pages/EditView/components/InputRenderer';
import { getRelationLabel } from '../../utils/relations';
import { useHistoryContext } from '../pages/History';

import { getRemaingFieldsLayout } from './VersionContent';

import type { EditFieldLayout } from '../../hooks/useDocumentLayout';
import type { RelationsFieldProps } from '../../pages/EditView/components/FormInputs/Relations';
import type { RelationResult } from '../../services/relations';
import type { Schema } from '@strapi/types';
import type { DistributiveOmit } from 'react-redux';

const StyledAlert = styled(Alert).attrs({ closeLabel: 'Close', onClose: () => {}, shadow: 'none' })`
  button {
    display: none;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * CustomRelationInput
 * -----------------------------------------------------------------------------------------------*/

const LinkEllipsis = styled(Link)`
  display: block;

  & > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
`;

const CustomRelationInput = (props: RelationsFieldProps) => {
  const { formatMessage } = useIntl();
  const field = useField<
    { results: RelationResult[]; meta: { missingCount: number } } | RelationResult[]
  >(props.name);

  /**
   * Ideally the server would return the correct shape, however, for admin user relations
   * it sanitizes everything out when it finds an object for the relation value.
   */
  let formattedFieldValue;
  if (field) {
    formattedFieldValue = Array.isArray(field.value)
      ? { results: field.value, meta: { missingCount: 0 } }
      : field.value;
  }

  if (
    !formattedFieldValue ||
    (formattedFieldValue.results.length === 0 && formattedFieldValue.meta.missingCount === 0)
  ) {
    return (
      <>
        <Field.Label action={props.labelAction}>{props.label}</Field.Label>
        <Box marginTop={1}>
          {/* @ts-expect-error – we dont need closeLabel */}
          <StyledAlert variant="default">
            {formatMessage({
              id: 'content-manager.history.content.no-relations',
              defaultMessage: 'No relations.',
            })}
          </StyledAlert>
        </Box>
      </>
    );
  }

  const { results, meta } = formattedFieldValue;

  return (
    <Box>
      <Field.Label>{props.label}</Field.Label>
      {results.length > 0 && (
        <Flex direction="column" gap={2} marginTop={1} alignItems="stretch">
          {results.map((relationData) => {
            // @ts-expect-error - targetModel does exist on the attribute. But it's not typed.
            const { targetModel } = props.attribute;
            const href = `../${COLLECTION_TYPES}/${targetModel}/${relationData.documentId}`;
            const label = getRelationLabel(relationData, props.mainField);
            const isAdminUserRelation = targetModel === 'admin::user';

            return (
              <Flex
                key={relationData.documentId ?? relationData.id}
                paddingTop={2}
                paddingBottom={2}
                paddingLeft={4}
                paddingRight={4}
                hasRadius
                borderColor="neutral200"
                background="neutral150"
                justifyContent="space-between"
              >
                <Box minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
                  <Tooltip label={label}>
                    {isAdminUserRelation ? (
                      <Typography>{label}</Typography>
                    ) : (
                      <LinkEllipsis tag={NavLink} to={href}>
                        {label}
                      </LinkEllipsis>
                    )}
                  </Tooltip>
                </Box>
                <DocumentStatus status={relationData.status as string} />
              </Flex>
            );
          })}
        </Flex>
      )}
      {meta.missingCount > 0 && (
        /* @ts-expect-error – we dont need closeLabel */
        <StyledAlert
          marginTop={1}
          variant="warning"
          title={formatMessage(
            {
              id: 'content-manager.history.content.missing-relations.title',
              defaultMessage:
                '{number, plural, =1 {Missing relation} other {{number} missing relations}}',
            },
            { number: meta.missingCount }
          )}
        >
          {formatMessage(
            {
              id: 'content-manager.history.content.missing-relations.message',
              defaultMessage:
                "{number, plural, =1 {It has} other {They have}} been deleted and can't be restored.",
            },
            { number: meta.missingCount }
          )}
        </StyledAlert>
      )}
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * CustomMediaInput
 * -----------------------------------------------------------------------------------------------*/

const CustomMediaInput = (props: VersionInputRendererProps) => {
  const { value } = useField(props.name);
  const results = value ? value.results : [];
  const meta = value ? value.meta : { missingCount: 0 };
  const { formatMessage } = useIntl();

  const fields = useStrapiApp('CustomMediaInput', (state) => state.fields);
  const MediaLibrary = fields.media as React.ComponentType<
    VersionInputRendererProps & { multiple: boolean }
  >;
  return (
    <Flex direction="column" gap={2} alignItems="stretch">
      <Form method="PUT" disabled={true} initialValues={{ [props.name]: results }}>
        <MediaLibrary {...props} disabled={true} multiple={results.length > 1} />
      </Form>
      {meta.missingCount > 0 && (
        <StyledAlert
          variant="warning"
          closeLabel="Close"
          onClose={() => {}}
          title={formatMessage(
            {
              id: 'content-manager.history.content.missing-assets.title',
              defaultMessage:
                '{number, plural, =1 {Missing asset} other {{number} missing assets}}',
            },
            { number: meta.missingCount }
          )}
        >
          {formatMessage(
            {
              id: 'content-manager.history.content.missing-assets.message',
              defaultMessage:
                "{number, plural, =1 {It has} other {They have}} been deleted in the Media Library and can't be restored.",
            },
            { number: meta.missingCount }
          )}
        </StyledAlert>
      )}
    </Flex>
  );
};

type VersionInputRendererProps = DistributiveOmit<EditFieldLayout, 'size'> & {
  /**
   * In the context of content history, deleted fields need to ignore RBAC
   * @default false
   */
  shouldIgnoreRBAC?: boolean;
};

/**
 * Checks if the i18n plugin added a label action to the field and modifies it
 * to adapt the wording for the history page.
 */
const getLabelAction = (labelAction: VersionInputRendererProps['labelAction']) => {
  if (!React.isValidElement(labelAction)) {
    return labelAction;
  }

  // TODO: find a better way to do this rather than access internals
  const labelActionTitleId = labelAction.props.title.id;

  if (labelActionTitleId === 'i18n.Field.localized') {
    return React.cloneElement(labelAction, {
      ...labelAction.props,
      title: {
        id: 'history.content.localized',
        defaultMessage:
          'This value is specific to this locale. If you restore this version, the content will not be replaced for other locales.',
      },
    });
  }

  if (labelActionTitleId === 'i18n.Field.not-localized') {
    return React.cloneElement(labelAction, {
      ...labelAction.props,
      title: {
        id: 'history.content.not-localized',
        defaultMessage:
          'This value is common to all locales. If you restore this version and save the changes, the content will be replaced for all locales.',
      },
    });
  }

  // Label action is unrelated to i18n, don't touch it.
  return labelAction;
};

/**
 * @internal
 *
 * @description An abstraction around the regular form input renderer designed specifically
 * to be used on the History page in the content-manager. It understands how to render specific
 * inputs within the context of a history version (i.e. relations, media, ignored RBAC, etc...)
 */
const VersionInputRenderer = ({
  visible,
  hint: providedHint,
  shouldIgnoreRBAC = false,
  labelAction,
  ...props
}: VersionInputRendererProps) => {
  const customLabelAction = getLabelAction(labelAction);

  const { formatMessage } = useIntl();
  const version = useHistoryContext('VersionContent', (state) => state.selectedVersion);
  const configuration = useHistoryContext('VersionContent', (state) => state.configuration);
  const fieldSizes = useTypedSelector((state) => state['content-manager'].app.fieldSizes);

  const { id, components } = useDoc();
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
  const {
    edit: { components: componentsLayout },
  } = useDocLayout();

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

  /**
   * Attributes found on the current content-type schema cannot be restored. We handle
   * this by displaying a warning alert to the user instead of the input for that field type.
   */
  const addedAttributes = version.meta.unknownAttributes.added;
  if (Object.keys(addedAttributes).includes(props.name)) {
    return (
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Field.Label>{props.label}</Field.Label>
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
      return (
        <CustomInput
          {...props}
          // @ts-expect-error – TODO: fix this type error in the useLazyComponents hook.
          hint={hint}
          labelAction={customLabelAction}
          disabled={fieldIsDisabled}
        />
      );
    }

    return (
      <FormInputRenderer
        {...props}
        hint={hint}
        labelAction={customLabelAction}
        // @ts-expect-error – this workaround lets us display that the custom field is missing.
        type={props.attribute.customField}
        disabled={fieldIsDisabled}
      />
    );
  }

  /**
   * Since media fields use a custom input via the upload plugin provided by the useLibrary hook,
   * we need to handle the them before other custom inputs coming from the useLibrary hook.
   */
  if (props.type === 'media') {
    return (
      <CustomMediaInput {...props} labelAction={customLabelAction} disabled={fieldIsDisabled} />
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
        {...props}
        // @ts-expect-error – TODO: fix this type error in the useLibrary hook.
        hint={hint}
        labelAction={customLabelAction}
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
      return <BlocksInput {...props} hint={hint} type={props.type} disabled={fieldIsDisabled} />;
    case 'component':
      const { layout } = componentsLayout[props.attribute.component];
      // Components can only have one panel, so only save the first layout item
      const [remainingFieldsLayout] = getRemaingFieldsLayout({
        layout: [layout],
        metadatas: configuration.components[props.attribute.component].metadatas,
        fieldSizes,
        schemaAttributes: components[props.attribute.component].attributes,
      });

      return (
        <ComponentInput
          {...props}
          layout={[...layout, ...(remainingFieldsLayout || [])]}
          hint={hint}
          labelAction={customLabelAction}
          disabled={fieldIsDisabled}
        >
          {(inputProps) => <VersionInputRenderer {...inputProps} shouldIgnoreRBAC={true} />}
        </ComponentInput>
      );
    case 'dynamiczone':
      return (
        <DynamicZone
          {...props}
          hint={hint}
          labelAction={customLabelAction}
          disabled={fieldIsDisabled}
        />
      );
    case 'relation':
      return (
        <CustomRelationInput
          {...props}
          hint={hint}
          labelAction={customLabelAction}
          disabled={fieldIsDisabled}
        />
      );
    case 'richtext':
      return (
        <Wysiwyg
          {...props}
          hint={hint}
          type={props.type}
          labelAction={customLabelAction}
          disabled={fieldIsDisabled}
        />
      );
    case 'uid':
      return (
        <UIDInput
          {...props}
          hint={hint}
          type={props.type}
          labelAction={customLabelAction}
          disabled={fieldIsDisabled}
        />
      );
    /**
     * Enumerations are a special case because they require options.
     */
    case 'enumeration':
      return (
        <FormInputRenderer
          {...props}
          hint={hint}
          labelAction={customLabelAction}
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
          labelAction={customLabelAction}
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

export type { VersionInputRendererProps };
export { VersionInputRenderer };
