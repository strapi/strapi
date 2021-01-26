import { get, toLower } from 'lodash';
import { nameToSlug } from '../utils/createUid';
import { attributesForm, attributeTypes, commonBaseForm } from '../attributes';
import { categoryForm, createCategorySchema } from '../category';
import { contentTypeForm, createContentTypeSchema } from '../contentType';
import { createComponentSchema, componentForm } from '../component';
import { dynamiczoneForm } from '../dynamicZone';

const forms = {
  attribute: {
    schema(
      currentSchema,
      attributeType,
      reservedNames,
      alreadyTakenTargetContentTypeAttributes,
      options,
      extensions
    ) {
      const attributes = get(currentSchema, ['schema', 'attributes'], {});

      const usedAttributeNames = Object.keys(attributes).filter(attr => {
        return attr !== options.initialData.name;
      });

      const validators = [];
      const attributeFormExtensions = extensions.attribute[attributeType];

      if (attributeFormExtensions) {
        attributeFormExtensions.forEach(({ validator }) => {
          if (validator) {
            validators.push(validator);
          }
        });
      }

      try {
        let shape = attributeTypes[attributeType](
          usedAttributeNames,
          reservedNames.attributes,
          alreadyTakenTargetContentTypeAttributes,
          options
        );

        validators.forEach(validator => {
          console.log({ validator });
          shape = shape.shape(validator);
        });

        return shape;
      } catch (err) {
        console.error('form', err);

        return attributeTypes.default(usedAttributeNames, reservedNames.attributes);
      }
    },
    form: {
      advanced(data, type, step, actionType, attributes, extensions) {
        const attributeFormExtensions = extensions.attribute[type];

        let customForms = [];

        if (attributeFormExtensions) {
          attributeFormExtensions.forEach(({ form }) => {
            if (form.advanced) {
              const blocksToAdd = form.advanced(data, type, step, actionType, attributes);

              blocksToAdd.forEach(block => {
                customForms.push(block);
              });
            }
          });
        }

        try {
          const baseForm = attributesForm.advanced[type](data, step).items;

          return { items: [...baseForm, ...customForms] };
        } catch (err) {
          console.error(err);

          return { items: [] };
        }
      },
      base(data, type, step, actionType, attributes) {
        try {
          return attributesForm.base[type](data, step, attributes);
        } catch (err) {
          return commonBaseForm;
        }
      },
    },
  },
  contentType: {
    schema(alreadyTakenNames, isEditing, ctUid, reservedNames) {
      const takenNames = isEditing
        ? alreadyTakenNames.filter(uid => uid !== ctUid)
        : alreadyTakenNames;

      return createContentTypeSchema(takenNames, reservedNames.models);
    },
    form: {
      base(data = {}, type, step, actionType) {
        if (actionType === 'create') {
          const value = data.name ? nameToSlug(data.name) : '';

          return contentTypeForm.base.create(value);
        }

        return contentTypeForm.base.edit();
      },
      advanced(data, type, step, actionType, attributes, extensions) {
        const baseForm = contentTypeForm.advanced.default().items;
        const customForms = [];

        extensions.contentType.forEach(({ form }) => {
          if (form.advanced) {
            const blocksToAdd = form.advanced(data, type, step, actionType, attributes);

            blocksToAdd.forEach(block => {
              customForms.push(block);
            });
          }
        });

        return { items: [...baseForm, ...customForms] };
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
          items: componentForm.advanced(),
        };
      },
      base() {
        return {
          items: componentForm.base(),
        };
      },
    },
  },
  addComponentToDynamicZone: {
    form: {
      advanced() {
        return dynamiczoneForm.advanced.default();
      },
      base(data) {
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
      base() {
        return categoryForm.base;
      },
    },
  },
};

export default forms;
