import { get, toLower } from 'lodash';
import { nameToSlug } from '../createUid';

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
      dataToValidate,
      isEditing,
      attributeToEditName,
      initialData,
      alreadyTakenTargetContentTypeAttributes,
      reservedNames
    ) {
      try {
        return attributeTypes[attributeType](
          currentSchema,
          initialData,
          isEditing,
          reservedNames.attributes,
          dataToValidate,
          alreadyTakenTargetContentTypeAttributes
        );
      } catch (err) {
        console.log(err);
        console.log(attributeType);

        return attributeTypes.default(
          currentSchema,
          initialData,
          isEditing,
          reservedNames.attributes
        );
      }
    },
    form: {
      advanced(data, type, step) {
        try {
          return attributesForm.advanced[type](data, step);
        } catch (err) {
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
      advanced() {
        return contentTypeForm.advanced.default();
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
