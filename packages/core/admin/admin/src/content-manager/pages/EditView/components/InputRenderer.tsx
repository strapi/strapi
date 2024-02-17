import { NotAllowedInput, useLibrary } from '@strapi/helper-plugin';

import { useForm } from '../../../components/Form';
import { InputRenderer as FormInputRenderer } from '../../../components/FormInputs/Renderer';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDoc } from '../../../hooks/useDocument';
import { useLazyComponents } from '../../../hooks/useLazyComponents';

import { BlocksInput } from './FormInputs/BlocksInput/BlocksInput';
import { ComponentInput } from './FormInputs/Component/Input';
import { DynamicZone, useDynamicZone } from './FormInputs/DynamicZone/Field';
import { UIDInput } from './FormInputs/UID';
import { Wysiwyg } from './FormInputs/Wysiwyg/Field';

import type { EditFieldLayout } from '../../../hooks/useDocumentLayout';
import type { Attribute } from '@strapi/types';

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

/**
 * @internal
 *
 * @description An abstraction around the regular form input renderer designed
 * specifically to be used in the EditView of the content-manager this understands
 * the complete EditFieldLayout and will handle RBAC conditions and rendering CM specific
 * components such as Blocks / Relations.
 */
const InputRenderer = ({ visible, ...props }: DistributiveOmit<EditFieldLayout, 'size'>) => {
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

  const { fields = {} } = useLibrary();
  const { lazyComponentStore } = useLazyComponents(
    attributeHasCustomFieldProperty(props.attribute) ? [props.attribute.customField] : undefined
  );

  if (!visible) {
    return null;
  }

  /**
   * If the user can't read the field then we don't want to ever render it.
   */
  if (!canUserReadField && !isInDynamicZone) {
    return (
      <NotAllowedInput
        description={props.hint ? { id: props.hint, defaultMessage: props.hint } : undefined}
        intlLabel={{ id: props.label, defaultMessage: props.label }}
        name={props.name}
      />
    );
  }

  const fieldIsDisabled =
    (!canUserEditField && !isInDynamicZone) || props.disabled || isFormDisabled;

  /**
   * Because a custom field has a unique prop but the type could be confused with either
   * the useField hook or the type of the field we need to handle it separately and first.
   */
  if (attributeHasCustomFieldProperty(props.attribute)) {
    const CustomInput = lazyComponentStore[props.attribute.customField];

    if (CustomInput) {
      // @ts-expect-error – TODO: fix this type error in the useLazyComponents hook.
      return <CustomInput {...props} disabled={fieldIsDisabled} />;
    } else {
      <FormInputRenderer
        {...props}
        // @ts-expect-error – this workaround lets us display that the custom field is missing.
        type={props.attribute.customField}
        disabled={fieldIsDisabled}
      />;
    }
  }

  /**
   * This is where we handle ONLY the fields from the `useLibrary` hook.
   */
  const addedInputTypes = Object.keys(fields);
  if (!attributeHasCustomFieldProperty(props.attribute) && addedInputTypes.includes(props.type)) {
    const CustomInput = fields[props.type];
    // @ts-expect-error – TODO: fix this type error in the useLibrary hook.
    return <CustomInput {...props} disabled={fieldIsDisabled} />;
  }

  /**
   * These include the content-manager specific fields, failing that we fall back
   * to the more generic form input renderer.
   */
  switch (props.type) {
    case 'blocks':
      return <BlocksInput {...props} type={props.type} disabled={fieldIsDisabled} />;
    case 'component':
      return <ComponentInput {...props} disabled={fieldIsDisabled} />;
    case 'dynamiczone':
      return <DynamicZone {...props} disabled={fieldIsDisabled} />;
    case 'richtext':
      return <Wysiwyg {...props} type={props.type} disabled={fieldIsDisabled} />;
    case 'uid':
      return <UIDInput {...props} type={props.type} disabled={fieldIsDisabled} />;
    /**
     * Enumerations are a special case because they require options.
     */
    case 'enumeration':
      return (
        <FormInputRenderer
          {...props}
          options={props.attribute.enum.map((value) => ({ value }))}
          // @ts-expect-error – Temp workaround so we don't forget custom-fields don't work!
          type={props.customField ? 'custom-field' : props.type}
          disabled={fieldIsDisabled}
        />
      );
    default:
      return (
        <FormInputRenderer
          {...props}
          // @ts-expect-error – Temp workaround so we don't forget custom-fields don't work!
          type={props.customField ? 'custom-field' : props.type}
          disabled={fieldIsDisabled}
        />
      );
  }
};

const attributeHasCustomFieldProperty = (
  attribute: Attribute.Any
): attribute is Attribute.Any & Attribute.CustomField<string> =>
  'customField' in attribute && typeof attribute.customField === 'string';

export { InputRenderer };
