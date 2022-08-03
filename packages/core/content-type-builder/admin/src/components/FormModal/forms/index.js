import get from 'lodash/get';
import toLower from 'lodash/toLower';
import { attributesForm, attributeTypes, commonBaseForm } from '../attributes';
import { categoryForm, createCategorySchema } from '../category';
import { contentTypeForm, createContentTypeSchema } from '../contentType';
import { createComponentSchema, componentForm } from '../component';
import { dynamiczoneForm } from '../dynamicZone';
import { nameField } from '../attributes/nameField';
import addItemsToFormSection from './utils/addItemsToFormSection';
import getTrad from '../../../utils/getTrad';

const getUsedAttributeNames = (attributes, schemaData) => {
  return attributes
    .filter(({ name }) => {
      return name !== schemaData.initialData.name;
    })
    .map(({ name }) => name);
};

const forms = {
  customField: {
    schema({
      schemaAttributes,
      attributeType,
      customFieldValidator,
      reservedNames,
      schemaData,
      ctbFormsAPI,
    }) {
      const usedAttributeNames = getUsedAttributeNames(schemaAttributes, schemaData);

      const attributeShape = attributeTypes[attributeType](
        usedAttributeNames,
        reservedNames.attributes
      );

      return ctbFormsAPI.makeCustomFieldValidator(
        attributeShape,
        customFieldValidator,
        usedAttributeNames,
        reservedNames.attributes,
        schemaData
      );
    },
    form: {
      base({ customField }) {
        // Default section with required name field
        const sections = [{ sectionTitle: null, items: [nameField] }];

        if (customField.options?.base) {
          addItemsToFormSection(customField.options.base, sections);
        }

        return { sections };
      },
      advanced({ customField, data, step, extensions, ...rest }) {
        // Default section with no fields
        const sections = [{ sectionTitle: null, items: [] }];
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
          // TODO: Discuss how to handle settings from other plugins
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
      currentSchema,
      attributeType,
      reservedNames,
      alreadyTakenTargetContentTypeAttributes,
      options,
      extensions
    ) {
      // Get the attributes object on the schema
      const attributes = get(currentSchema, ['schema', 'attributes'], []);
      const usedAttributeNames = getUsedAttributeNames(attributes, options);

      try {
        let attributeShape = attributeTypes[attributeType](
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
      advanced({ data, type, step, extensions, ...rest }) {
        try {
          const baseForm = attributesForm.advanced[type](data, step).sections;
          const itemsToAdd = extensions.getAdvancedForm(['attribute', type], {
            data,
            type,
            step,
            ...rest,
          });

          const sections = baseForm.reduce((acc, current) => {
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
      base({ data, type, step, attributes }) {
        try {
          return attributesForm.base[type](data, step, attributes);
        } catch (err) {
          return commonBaseForm;
        }
      },
    },
  },
  contentType: {
    schema(alreadyTakenNames, isEditing, ctUid, reservedNames, extensions, contentTypes) {
      const singularNames = Object.values(contentTypes).map(contentType => {
        return contentType.schema.singularName;
      });

      const pluralNames = Object.values(contentTypes).map(contentType => {
        return contentType.schema.pluralNames;
      });

      const takenNames = isEditing
        ? alreadyTakenNames.filter(uid => uid !== ctUid)
        : alreadyTakenNames;

      const takenSingularNames = isEditing
        ? singularNames.filter(singName => {
            const currentSingularName = get(contentTypes, [ctUid, 'schema', 'singularName'], '');

            return currentSingularName !== singName;
          })
        : singularNames;

      const takenPluralNames = isEditing
        ? pluralNames.filter(pluralName => {
            const currentPluralName = get(contentTypes, [ctUid, 'schema', 'pluralName'], '');

            return currentPluralName !== pluralName;
          })
        : pluralNames;

      const contentTypeShape = createContentTypeSchema(
        takenNames,
        reservedNames.models,
        takenSingularNames,
        takenPluralNames
      );

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
      base({ actionType }) {
        if (actionType === 'create') {
          return contentTypeForm.base.create();
        }

        return contentTypeForm.base.edit();
      },
      advanced({ extensions, ...rest }) {
        const baseForm = contentTypeForm.advanced.default(rest).sections;
        const itemsToAdd = extensions.getAdvancedForm(['contentType']);

        return {
          sections: [
            ...baseForm,
            {
              sectionTitle: {
                id: 'global.settings',
                defaultMessage: 'Settings',
              },
              items: itemsToAdd,
            },
          ],
        };
      },
    },
  },
  component: {
    schema(
      alreadyTakenAttributes,
      componentCategory,
      reservedNames,
      isEditing = false,
      compoUid = null
    ) {
      const takenNames = isEditing
        ? alreadyTakenAttributes.filter(uid => uid !== compoUid)
        : alreadyTakenAttributes;

      return createComponentSchema(takenNames, reservedNames.models, componentCategory);
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
      base({ data }) {
        const isCreatingComponent = get(data, 'createComponent', false);

        if (isCreatingComponent) {
          return dynamiczoneForm.base.createComponent();
        }

        return dynamiczoneForm.base.default();
      },
    },
  },
  editCategory: {
    schema(allCategories, initialData) {
      const allowedCategories = allCategories
        .filter(cat => cat !== initialData.name)
        .map(cat => toLower(cat));

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

export default forms;
