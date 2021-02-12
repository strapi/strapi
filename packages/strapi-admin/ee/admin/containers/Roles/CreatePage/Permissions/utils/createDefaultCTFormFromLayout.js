import { merge, isEmpty, set } from 'lodash';

/**
 * Creates the default condition form: { [conditionId]: false }
 * @param {object} conditions.id Id of the condition
 * @returns {object}
 */
const createDefaultConditionsForm = conditions =>
  conditions.reduce((acc, current) => {
    acc[current.id] = false;

    return acc;
  }, {});

/**
 * Create the default form a property (fields, locales) with all the values
 * set to false
 * @param {object} property.children ex: {children: [{value: 'foo',}]}
 * @returns {object} ex: { foo: false }
 *
 */
const createDefaultPropertyForms = ({ children }) => {
  return children.reduce((acc, current) => {
    if (current.children) {
      return { ...acc, [current.value]: createDefaultPropertyForms(current) };
    }

    acc[current.value] = false;

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
const createDefaultPropertiesForm = (propertiesArray, ctLayout) => {
  return propertiesArray.reduce((acc, currentPropertyName) => {
    const foundProperty = ctLayout.properties.find(({ value }) => value === currentPropertyName);

    if (foundProperty) {
      const propertyForm = createDefaultPropertyForms(foundProperty);

      acc[currentPropertyName] = propertyForm;
    }

    return acc;
  }, {});
};

/**
 * Return an object of content types layout of an action's subject ex: { adress: {uid, label, properties } }
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
const createDefaultCTFormFromLayout = ({ subjects }, actionArray, conditionArray) => {
  return actionArray.reduce((acc, current) => {
    const actionSubjects = current.subjects;

    const subjectLayouts = findLayouts(subjects, actionSubjects);

    // This can happen when an action is not related to a content type
    // for instance the D&P permission is applied only with the cts that
    // have the D&P features enabled
    if (isEmpty(subjectLayouts)) {
      return acc;
    }

    // The object has the following shape: { [ctUID]: { [actionId]: { [property]: { enabled: false } } } }
    const contentTypesActions = Object.keys(subjectLayouts).reduce((acc2, currentCTUID) => {
      const { actionId, applyToProperties } = current;
      const conditionsForm = createDefaultConditionsForm(conditionArray);

      if (isEmpty(applyToProperties)) {
        set(acc2, [currentCTUID, actionId], { enabled: false, conditions: conditionsForm });

        return acc2;
      }

      const propertiesForm = createDefaultPropertiesForm(
        applyToProperties,
        subjectLayouts[currentCTUID]
      );

      set(acc2, [currentCTUID, actionId], { ...propertiesForm, conditions: conditionsForm });

      return acc2;
    }, {});

    return merge(acc, contentTypesActions);
  }, {});
};

export default createDefaultCTFormFromLayout;
export {
  createDefaultConditionsForm,
  createDefaultPropertyForms,
  createDefaultPropertiesForm,
  findLayouts,
};
