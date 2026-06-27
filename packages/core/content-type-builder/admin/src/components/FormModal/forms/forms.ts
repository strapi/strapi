import { getTrad } from '../../../utils';
import { commonBaseForm } from '../attributes/commonBaseForm';
import { attributesForm } from '../attributes/form';
import { nameField } from '../attributes/nameField';
import { attributeTypes } from '../attributes/types';
import { componentForm } from '../component/componentForm';
import { createComponentSchema } from '../component/createComponentSchema';
import { contentTypeForm } from '../contentType/contentTypeForm';
import { createContentTypeSchema } from '../contentType/createContentTypeSchema';
import { dynamiczoneForm } from '../dynamiczoneForm';

import { addItemsToFormSection, FormTypeOptions } from './utils/addItemsToFormSection';
import { createComponentCollectionName } from './utils/createCollectionName';
import { Attribute, getUsedAttributeNames, SchemaData } from './utils/getUsedAttributeNames';

import type { Component, ContentType } from '../../../types';
import type { FormAPI } from '../../../utils/formAPI';
import type { FormModalData } from '../reducer';
import type { Internal } from '@strapi/types';

type AttributeType = keyof typeof attributeTypes;
type CustomFieldFormOptions = Parameters<typeof addItemsToFormSection>[0];
type CustomFieldValidator = Parameters<FormAPI['makeCustomFieldValidator']>[1];
type FormSection = FormTypeOptions[number];
type FormItem = FormSection['items'][number];

type CustomField = {
  type: AttributeType;
  options?: {
    base?: CustomFieldFormOptions;
    advanced?: CustomFieldFormOptions;
    validator?: CustomFieldValidator;
  };
};

export type SchemaParams = {
  schemaAttributes: Attribute[];
  attributeType: AttributeType;
  customFieldValidator: CustomFieldValidator;
  reservedNames: {
    attributes: Array<string>;
  };
  schemaData: SchemaData;
  ctbFormsAPI: FormAPI;
};

type Base<TAttributesFormType extends 'base' | 'advanced'> = {
  data: FormModalData;
  type: keyof (typeof attributesForm)[TAttributesFormType];
  step: string | null;
  attributes: Attribute[];
  extensions: FormAPI;
  forTarget: string;
};

type CustomFieldFormParams = {
  customField: CustomField;
  data?: FormModalData;
  step?: string | null;
  extensions: FormAPI;
} & Record<string, unknown>;

export const forms = {
  customField: {
    schema({
      schemaAttributes,
      attributeType,
      customFieldValidator,
      reservedNames,
      schemaData,
      ctbFormsAPI,
    }: SchemaParams) {
      const usedAttributeNames = getUsedAttributeNames(schemaAttributes, schemaData);

      let attributeShape;
      if (attributeType === 'relation') {
        attributeShape = attributeTypes[attributeType](
          usedAttributeNames,
          reservedNames.attributes,
          [],
          { initialData: {}, modifiedData: {} }
        );
      } else {
        attributeShape = attributeTypes[attributeType](
          usedAttributeNames,
          reservedNames.attributes
        );
      }

      return ctbFormsAPI.makeCustomFieldValidator(
        attributeShape,
        customFieldValidator,
        usedAttributeNames,
        reservedNames.attributes,
        schemaData
      );
    },
    form: {
      base({ customField }: Pick<CustomFieldFormParams, 'customField'>) {
        // Default section with required name field
        const sections: FormTypeOptions = [{ sectionTitle: null, items: [nameField] }];

        if (customField.options?.base) {
          addItemsToFormSection(customField.options.base, sections);
        }

        return { sections };
      },
      advanced({ customField, data, step, extensions, ...rest }: CustomFieldFormParams) {
        // Default section with no fields
        const sections: FormTypeOptions = [
          { sectionTitle: null, items: [] },
          {
            sectionTitle: { id: 'form.attribute.condition.section', defaultMessage: 'Conditions' },
            items: [
              {
                name: 'conditions',
                type: 'condition-form',
                intlLabel: {
                  id: 'form.attribute.condition.label',
                  defaultMessage: 'Visibility condition',
                },
                description: {
                  id: 'form.attribute.condition.desc',
                  defaultMessage: 'Show this field only when a boolean/enum condition matches.',
                },
              },
            ],
          },
        ];
        const injectedInputs = extensions.getAdvancedForm(['attribute', customField.type], {
          data,
          type: customField.type,
          step,
          customField,
          ...rest,
        }) as FormItem[] | undefined;

        if (customField.options?.advanced) {
          addItemsToFormSection(customField.options.advanced, sections);
        }

        if (injectedInputs !== undefined) {
          const extendedSettings = {
            sectionTitle: {
              id: getTrad('modalForm.custom-fields.advanced.settings.extended'),
              defaultMessage: 'Extended settings',
            },
            items: injectedInputs,
          };

          sections.push(extendedSettings);
        }

        return { sections };
      },
    },
  },
  attribute: {
    schema(
      currentSchema: { attributes?: Attribute[] } | null | undefined,
      attributeType: AttributeType,
      reservedNames: {
        attributes: Array<string>;
      },
      alreadyTakenTargetContentTypeAttributes: Array<Attribute>,
      options: SchemaData,
      extensions: {
        makeValidator: FormAPI['makeValidator'];
      }
    ) {
      // Get the attributes object on the schema
      const attributes: Array<Attribute> = currentSchema?.attributes ?? [];
      const usedAttributeNames = getUsedAttributeNames(attributes, options);

      try {
        const attributeShape = attributeTypes[attributeType](
          usedAttributeNames,
          reservedNames.attributes,
          alreadyTakenTargetContentTypeAttributes,
          options
        );

        return extensions.makeValidator(
          ['attribute', attributeType],
          attributeShape,
          usedAttributeNames,
          reservedNames.attributes,
          alreadyTakenTargetContentTypeAttributes,
          options
        );
      } catch (err) {
        console.error('Error yup build schema', err);

        return attributeTypes.default(usedAttributeNames, reservedNames.attributes);
      }
    },
    form: {
      advanced({ data, type, step, extensions, ...rest }: Base<'advanced'>) {
        try {
          const baseForm = attributesForm.advanced[type](data, step).sections;
          const itemsToAdd = extensions.getAdvancedForm(['attribute', type], {
            data,
            type,
            step,
            customField: null,
            ...rest,
          }) as FormItem[];

          let injected = false;

          const sections = baseForm.reduce<FormTypeOptions>((acc, current) => {
            if (current.sectionTitle === null || injected) {
              acc.push(current);
            } else {
              acc.push({ ...current, items: [...current.items, ...itemsToAdd] });
              injected = true;
            }

            return acc;
          }, []);
          // IF we want a dedicated section for the plugins
          // const sections = [
          //   ...baseForm,
          //   {
          //     sectionTitle: { id: 'Zone pour plugins', defaultMessage: 'Zone pour plugins' },
          //     items: itemsToAdd,
          //   },
          // ];

          return { sections };
        } catch (err) {
          console.error(err);

          return { sections: [] };
        }
      },
      base({ data, type, step, attributes }: Base<'base'>) {
        try {
          return attributesForm.base[type](data, step, attributes);
        } catch (err) {
          return commonBaseForm;
        }
      },
    },
  },
  contentType: {
    schema(
      alreadyTakenNames: Array<string>,
      isEditing: boolean,
      ctUid: Internal.UID.ContentType,
      reservedNames: {
        models: string[];
      },
      extensions: FormAPI,
      contentTypes: Record<Internal.UID.ContentType, ContentType>
    ) {
      const singularNames = Object.values(contentTypes).map((contentType) => {
        return contentType.info.singularName;
      });

      const pluralNames = Object.values(contentTypes).map((contentType) => {
        return contentType?.info?.pluralName ?? '';
      });

      const takenNames = isEditing
        ? alreadyTakenNames.filter((uid) => uid !== ctUid)
        : alreadyTakenNames;

      const takenSingularNames = isEditing
        ? singularNames.filter((singName) => {
            const { info } = contentTypes[ctUid];

            return info.singularName !== singName;
          })
        : singularNames;

      const takenPluralNames = isEditing
        ? pluralNames.filter((pluralName) => {
            const { info } = contentTypes[ctUid];

            return info.pluralName !== pluralName;
          })
        : pluralNames;

      // return the array of collection names not all normalized
      const collectionNames = Object.values(contentTypes).map((contentType) => {
        return contentType?.collectionName ?? '';
      });

      const takenCollectionNames = isEditing
        ? collectionNames.filter((collectionName) => {
            const { collectionName: currentCollectionName } = contentTypes[ctUid];

            return collectionName !== currentCollectionName;
          })
        : collectionNames;

      const contentTypeShape = createContentTypeSchema({
        usedContentTypeNames: takenNames,
        reservedModels: reservedNames.models,
        singularNames: takenSingularNames,
        pluralNames: takenPluralNames,
        collectionNames: takenCollectionNames,
      });

      // FIXME
      return extensions.makeValidator(
        ['contentType'],
        contentTypeShape,
        takenNames,
        reservedNames.models,
        takenSingularNames,
        takenPluralNames
      );
    },
    form: {
      base({ actionType }: { actionType?: string }) {
        if (actionType === 'create') {
          return contentTypeForm.base.create();
        }

        return contentTypeForm.base.edit();
      },
      advanced({ extensions }: { extensions: FormAPI }) {
        const baseForm = contentTypeForm.advanced
          .default()
          .sections.map((section) => section.items)
          .flat();
        const itemsToAdd = extensions.getAdvancedForm(['contentType']);

        return {
          sections: [
            {
              items: [...baseForm, ...itemsToAdd],
            },
          ],
        };
      },
    },
  },
  component: {
    schema(
      alreadyTakenAttributes: Array<Internal.UID.Component>,
      componentCategory: string,
      reservedNames: {
        models: string[];
      },
      isEditing = false,
      components: Record<Internal.UID.Component, Component>,
      componentDisplayName: string,
      compoUid: Internal.UID.Component | null = null
    ) {
      const takenNames = isEditing
        ? alreadyTakenAttributes.filter((uid: Internal.UID.Component) => uid !== compoUid)
        : alreadyTakenAttributes;
      const collectionNames = Object.values(components).map((component) => {
        return component?.collectionName;
      });

      const currentCollectionName = createComponentCollectionName(
        componentDisplayName,
        componentCategory
      );

      const takenCollectionNames = isEditing
        ? collectionNames.filter((collectionName) => collectionName !== currentCollectionName)
        : collectionNames;

      return createComponentSchema(
        takenNames,
        reservedNames.models,
        componentCategory,
        takenCollectionNames,
        currentCollectionName
      );
    },
    form: {
      advanced() {
        return {
          sections: componentForm.advanced(),
        };
      },
      base() {
        return {
          sections: componentForm.base(),
        };
      },
    },
  },
  addComponentToDynamicZone: {
    form: {
      advanced() {
        return dynamiczoneForm.advanced.default();
      },
      base({ data }: { data: FormModalData }) {
        const isCreatingComponent = data?.createComponent ?? false;

        if (isCreatingComponent) {
          return dynamiczoneForm.base.createComponent();
        }

        return dynamiczoneForm.base.default();
      },
    },
  },
};
