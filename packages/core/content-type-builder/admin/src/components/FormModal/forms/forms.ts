import { getTrad } from '../../../utils';
import { commonBaseForm } from '../attributes/commonBaseForm';
import { attributesForm } from '../attributes/form';
import { nameField } from '../attributes/nameField';
import { attributeTypes } from '../attributes/types';
import { createCategorySchema } from '../category/createCategorySchema';
import { categoryForm } from '../category/form';
import { componentForm } from '../component/componentForm';
import { createComponentSchema } from '../component/createComponentSchema';
import { contentTypeForm } from '../contentType/contentTypeForm';
import { createContentTypeSchema } from '../contentType/createContentTypeSchema';
import { dynamiczoneForm } from '../dynamiczoneForm';

import { addItemsToFormSection, FormTypeOptions } from './utils/addItemsToFormSection';
import { createComponentCollectionName } from './utils/createCollectionName';
import { Attribute, getUsedAttributeNames, SchemaData } from './utils/getUsedAttributeNames';

import type { Internal } from '@strapi/types';

type ContentType = {
  schema: {
    singularName: string;
    pluralName: string;
    collectionName: string;
  };
};

export type SchemaParams = {
  schemaAttributes: any;
  attributeType: keyof typeof attributeTypes;
  customFieldValidator: any;
  reservedNames: {
    attributes: Array<string>;
  };
  schemaData: any;
  ctbFormsAPI: any;
};

type Base<TAttributesFormType extends 'base' | 'advanced'> = {
  data: any;
  type: keyof (typeof attributesForm)[TAttributesFormType];
  step: string;
  attributes: any;
  extensions: any;
  forTarget: string;
};

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
      base({ customField }: any) {
        // Default section with required name field
        const sections: FormTypeOptions = [{ sectionTitle: null, items: [nameField] }];

        if (customField.options?.base) {
          addItemsToFormSection(customField.options.base, sections);
        }

        return { sections };
      },
      advanced({ customField, data, step, extensions, ...rest }: any) {
        // Default section with no fields
        const sections: FormTypeOptions = [{ sectionTitle: null, items: [] }];
        const injectedInputs = extensions.getAdvancedForm(['attribute', customField.type], {
          data,
          type: customField.type,
          step,
          ...rest,
        });

        if (customField.options?.advanced) {
          addItemsToFormSection(customField.options.advanced, sections);
        }

        if (injectedInputs) {
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
      currentSchema: any,
      attributeType: keyof typeof attributeTypes,
      reservedNames: {
        attributes: Array<string>;
      },
      alreadyTakenTargetContentTypeAttributes: Array<Attribute>,
      options: SchemaData,
      extensions: {
        makeValidator: any;
      }
    ) {
      // Get the attributes object on the schema
      const attributes: Array<Attribute> = currentSchema?.schema?.attributes ?? [];
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
            ...rest,
          });

          const sections = baseForm.reduce((acc: Array<any>, current: any) => {
            if (current.sectionTitle === null) {
              acc.push(current);
            } else {
              acc.push({ ...current, items: [...current.items, ...itemsToAdd] });
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
        models: any;
      },
      extensions: any,
      contentTypes: Record<string, ContentType>
    ) {
      const singularNames = Object.values(contentTypes).map((contentType) => {
        return contentType.schema.singularName;
      });

      const pluralNames = Object.values(contentTypes).map((contentType: any) => {
        return contentType?.schema?.pluralName ?? '';
      });

      const takenNames = isEditing
        ? alreadyTakenNames.filter((uid) => uid !== ctUid)
        : alreadyTakenNames;

      const takenSingularNames = isEditing
        ? singularNames.filter((singName) => {
            const { schema } = contentTypes[ctUid];

            return schema.singularName !== singName;
          })
        : singularNames;

      const takenPluralNames = isEditing
        ? pluralNames.filter((pluralName) => {
            const { schema } = contentTypes[ctUid];

            return schema.pluralName !== pluralName;
          })
        : pluralNames;

      // return the array of collection names not all normalized
      const collectionNames = Object.values(contentTypes).map((contentType) => {
        return contentType?.schema?.collectionName ?? '';
      });

      const takenCollectionNames = isEditing
        ? collectionNames.filter((collectionName) => {
            const { schema } = contentTypes[ctUid];
            const currentCollectionName = schema.collectionName;

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
      base({ actionType }: any) {
        if (actionType === 'create') {
          return contentTypeForm.base.create();
        }

        return contentTypeForm.base.edit();
      },
      advanced({ extensions }: any) {
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
        models: any;
      },
      isEditing = false,
      components: Record<string, any>,
      componentDisplayName: string,
      compoUid: Internal.UID.Component | null = null
    ) {
      const takenNames = isEditing
        ? alreadyTakenAttributes.filter((uid: Internal.UID.Component) => uid !== compoUid)
        : alreadyTakenAttributes;
      const collectionNames = Object.values(components).map((component: any) => {
        return component?.schema?.collectionName;
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
      base({ data }: any) {
        const isCreatingComponent = data?.createComponent ?? false;

        if (isCreatingComponent) {
          return dynamiczoneForm.base.createComponent();
        }

        return dynamiczoneForm.base.default();
      },
    },
  },
  editCategory: {
    schema(allCategories: Array<any>, initialData: any) {
      const allowedCategories = allCategories
        .filter((cat) => cat !== initialData.name)
        .map((cat) => cat.toLowerCase());

      return createCategorySchema(allowedCategories);
    },
    form: {
      advanced: () => ({ sections: [] }),
      base() {
        return categoryForm.base;
      },
    },
  },
};
