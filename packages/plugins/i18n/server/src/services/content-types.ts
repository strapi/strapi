import _ from 'lodash';
import { pick, pipe, has, prop, isNil, cloneDeep, isArray } from 'lodash/fp';
import { errors, contentTypes as contentTypeUtils } from '@strapi/utils';
import { getService } from '../utils';

const {
  isRelationalAttribute,
  getVisibleAttributes,
  isTypedAttribute,
  getScalarAttributes,
  getRelationalAttributes,
} = contentTypeUtils;
const { ApplicationError } = errors;

const hasLocalizedOption = (modelOrAttribute: any) => {
  return prop('pluginOptions.i18n.localized', modelOrAttribute) === true;
};

const getValidLocale = async (locale: any) => {
  const localesService = getService('locales');

  if (isNil(locale)) {
    return localesService.getDefaultLocale();
  }

  const foundLocale = await localesService.findByCode(locale);
  if (!foundLocale) {
    throw new ApplicationError('Locale not found');
  }

  return locale;
};

/**
 * Returns whether an attribute is localized or not
 * @param {*} attribute
 * @returns
 */
const isLocalizedAttribute = (attribute: any) => {
  return (
    hasLocalizedOption(attribute) ||
    isRelationalAttribute(attribute) ||
    isTypedAttribute(attribute, 'uid')
  );
};

/**
 * Returns whether a model is localized or not
 * @param {*} model
 * @returns
 */
const isLocalizedContentType = (model: any) => {
  return hasLocalizedOption(model);
};

/**
 * Returns the list of attribute names that are not localized
 * @param {object} model
 * @returns {string[]}
 */
const getNonLocalizedAttributes = (model: any) => {
  return getVisibleAttributes(model).filter(
    (attrName) => !isLocalizedAttribute(model.attributes[attrName])
  );
};

const removeId = (value: any) => {
  if (typeof value === 'object' && has('id', value)) {
    delete value.id;
  }
};

const removeIds = (model: any) => (entry: any) => removeIdsMut(model, cloneDeep(entry));

const removeIdsMut = (model: any, entry: any) => {
  if (isNil(entry)) {
    return entry;
  }

  removeId(entry);

  _.forEach(model.attributes, (attr, attrName) => {
    const value = entry[attrName];
    if (attr.type === 'dynamiczone' && isArray(value)) {
      value.forEach((compo) => {
        if (has('__component', compo)) {
          const model = strapi.components[compo.__component];
          removeIdsMut(model, compo);
        }
      });
    } else if (attr.type === 'component') {
      const model = strapi.components[attr.component];
      if (isArray(value)) {
        value.forEach((compo) => removeIdsMut(model, compo));
      } else {
        removeIdsMut(model, value);
      }
    }
  });

  return entry;
};

/**
 * Returns a copy of an entry picking only its non localized attributes
 * @param {object} model
 * @param {object} entry
 * @returns {object}
 */
const copyNonLocalizedAttributes = (model: any, entry: any) => {
  const nonLocalizedAttributes = getNonLocalizedAttributes(model);

  return pipe(pick(nonLocalizedAttributes), removeIds(model))(entry);
};

/**
 * Returns the list of attribute names that are localized
 * @param {object} model
 * @returns {string[]}
 */
const getLocalizedAttributes = (model: any) => {
  return getVisibleAttributes(model).filter((attrName) =>
    isLocalizedAttribute(model.attributes[attrName])
  );
};

/**
 * Fill non localized fields of an entry if there are nil
 * @param {Object} entry entry to fill
 * @param {Object} relatedEntry values used to fill
 * @param {Object} options
 * @param {Object} options.model corresponding model
 */
const fillNonLocalizedAttributes = (entry: any, relatedEntry: any, { model }: any) => {
  if (isNil(relatedEntry)) {
    return;
  }

  const modelDef = strapi.getModel(model);
  const relatedEntryCopy = copyNonLocalizedAttributes(modelDef, relatedEntry);

  _.forEach(relatedEntryCopy, (value, field) => {
    if (isNil(entry[field])) {
      entry[field] = value;
    }
  });
};

/**
 * build the populate param to
 * @param {String} modelUID uid of the model, could be of a content-type or a component
 */
const getNestedPopulateOfNonLocalizedAttributes = (modelUID: any) => {
  const schema = strapi.getModel(modelUID);
  const scalarAttributes = getScalarAttributes(schema);
  const nonLocalizedAttributes = getNonLocalizedAttributes(schema);

  const allAttributes = [...scalarAttributes, ...nonLocalizedAttributes];
  if (schema.modelType === 'component') {
    // When called recursively on a non localized component we
    // need to explicitly populate that components relations
    allAttributes.push(...getRelationalAttributes(schema));
  }

  const currentAttributesToPopulate = allAttributes.filter((value, index, self) => {
    return self.indexOf(value) === index && self.lastIndexOf(value) === index;
  });

  const attributesToPopulate = [...currentAttributesToPopulate];
  for (const attrName of currentAttributesToPopulate) {
    const attr = schema.attributes[attrName];
    if (attr.type === 'component') {
      const nestedPopulate = getNestedPopulateOfNonLocalizedAttributes(attr.component).map(
        (nestedAttr) => `${attrName}.${nestedAttr}`
      );
      attributesToPopulate.push(...nestedPopulate);
    } else if (attr.type === 'dynamiczone') {
      attr.components.forEach((componentName) => {
        const nestedPopulate = getNestedPopulateOfNonLocalizedAttributes(componentName).map(
          (nestedAttr) => `${attrName}.${nestedAttr}`
        );
        attributesToPopulate.push(...nestedPopulate);
      });
    }
  }

  return attributesToPopulate;
};

const contentTypes = () => ({
  isLocalizedContentType,
  getValidLocale,
  getLocalizedAttributes,
  getNonLocalizedAttributes,
  copyNonLocalizedAttributes,
  fillNonLocalizedAttributes,
  getNestedPopulateOfNonLocalizedAttributes,
});

type ContentTypesService = typeof contentTypes;

export default contentTypes;
export { ContentTypesService };
