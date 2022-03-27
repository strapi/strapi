import { merge, get, isEmpty, set } from 'lodash';
import findMatchingPermission from './findMatchingPermissions';
/**
 * Creates the default condition form: { [conditionId]: false }
 * @param {object} conditions.id Id of the condition
 * @returns {object}
 */
const createDefaultConditionsForm = (conditions, initialConditions = []) =>
  conditions.reduce((acc, current) => {
    acc[current.id] = initialConditions.indexOf(current.id) !== -1;

    return acc;
  }, {});

/**
 * Create the default form a property (fields, locales) with all the values
 * set to false
 * @param {object} property.children ex: {children: [{value: 'foo',}]}
 * @param {array<string>} The found property values retrieved from the role associated permissions
 * @returns {object} ex: { foo: false }
 *
 */
const createDefaultPropertyForms = ({ children }, propertyValues, prefix = '') => {
  return children.reduce((acc, current) => {
    if (current.children) {
      return {
        ...acc,
        [current.value]: createDefaultPropertyForms(
          current,
          propertyValues,
          `${prefix}${current.value}.`
        ),
      };
    }

    const hasProperty = propertyValues.indexOf(`${prefix}${current.value}`) !== -1;

    acc[current.value] = hasProperty;

    return acc;
  }, {});
};

/**
 * Creates the default form for all the properties found in a content type's layout
 * @param {array<string>} propertiesArray ex; ['fields', 'locales']
 * @param {object} ctLayout layout of the content type ex:
 * ctLayout = {
 *  properties: [{
 *    value: 'fields',
 *    children: [{value: 'name'}]
 *  }
 * }
 * @returns {object} In this case it will return { fields: { name: false } }
 */
const createDefaultPropertiesForm = (propertiesArray, ctLayout, matchingPermission) => {
  return propertiesArray.reduce(
    (acc, currentPropertyName) => {
      const foundProperty = ctLayout.properties.find(({ value }) => value === currentPropertyName);

      if (foundProperty) {
        const matchingPermissionPropertyValues = get(
          matchingPermission,
          ['properties', foundProperty.value],
          []
        );
        const propertyForm = createDefaultPropertyForms(
          foundProperty,
          matchingPermissionPropertyValues
        );

        acc.properties[currentPropertyName] = propertyForm;
      }

      return acc;
    },
    { properties: {} }
  );
};

/**
 * Return an object of content types layout of an action's subject ex: { address: {uid, label, properties } }
 * @param {array<object>} allLayouts All the content types' layout
 * @param {object} subjects
 */
const findLayouts = (allLayouts, subjects) => {
  return subjects.reduce((acc, current) => {
    const foundLayout = allLayouts.find(({ uid }) => uid === current) || null;

    if (foundLayout) {
      acc[current] = foundLayout;
    }

    return acc;
  }, {});
};

/**
 * Creates the default for for a content type
 * @param {object} layout.subjects All the content types to display
 * @param {array<object>} actionArray An action has the following shape:
 * action = {label: 'string', actionId: 'string', subjects: [object], applyToProperties: ['string]}
 * @param {array<object>} conditionArray Ex: { id: 'string', category: 'string' }
 * @returns {object} Ex:
 * {
 *  ctUId: {
 *    [actionId]: {
 *      [propertyName]: { enabled: false, conditions: { [id]: false } }
 *    }
 *  }
 * }
 */
const createDefaultCTFormFromLayout = (
  { subjects },
  actionArray,
  conditionArray,
  initialPermissions = []
) => {
  return actionArray.reduce((defaultForm, current) => {
    const actionSubjects = current.subjects;

    const subjectLayouts = findLayouts(subjects, actionSubjects);

    // This can happen when an action is not related to a content type
    // for instance the D&P permission is applied only with the cts that
    // have the D&P features enabled
    if (isEmpty(subjectLayouts)) {
      return defaultForm;
    }

    // The object has the following shape: { [ctUID]: { [actionId]: { [property]: { enabled: false } } } }
    const contentTypesActions = Object.keys(subjectLayouts).reduce((acc, currentCTUID) => {
      const { actionId, applyToProperties } = current;
      const currentSubjectLayout = subjectLayouts[currentCTUID];
      const properties = currentSubjectLayout.properties.map(({ value }) => value);
      const doesNothaveProperty = properties.every(
        property => (applyToProperties || []).indexOf(property) === -1
      );

      const matchingPermission = findMatchingPermission(initialPermissions, actionId, currentCTUID);
      const conditionsForm = createDefaultConditionsForm(
        conditionArray,
        get(matchingPermission, 'conditions', [])
      );

      if (isEmpty(applyToProperties) || doesNothaveProperty) {
        set(acc, [currentCTUID, actionId], {
          properties: {
            enabled: matchingPermission !== undefined,
          },
          conditions: conditionsForm,
        });

        return acc;
      }

      const propertiesForm = createDefaultPropertiesForm(
        applyToProperties,
        subjectLayouts[currentCTUID],
        matchingPermission
      );

      set(acc, [currentCTUID, actionId], { ...propertiesForm, conditions: conditionsForm });

      return acc;
    }, {});

    return merge(defaultForm, contentTypesActions);
  }, {});
};

export default createDefaultCTFormFromLayout;
export {
  createDefaultConditionsForm,
  createDefaultPropertyForms,
  createDefaultPropertiesForm,
  findLayouts,
};
