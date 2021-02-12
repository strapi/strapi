import { merge, isEmpty, set } from 'lodash';

// TODO add comments
const createConditionsForm = conditions =>
  conditions.reduce((acc, current) => {
    acc[current.id] = false;

    return acc;
  }, {});

const createDefaultFormForProperty = ({ children }) => {
  return children.reduce((acc, current) => {
    if (current.children) {
      return { ...acc, [current.value]: createDefaultFormForProperty(current) };
    }

    acc[current.value] = false;

    return acc;
  }, {});
};

const createDefaultPropertiesForm = (propertiesArray, ctLayout) => {
  return propertiesArray.reduce((acc, currentPropertyName) => {
    const foundProperty = ctLayout.properties.find(({ value }) => value === currentPropertyName);

    if (foundProperty) {
      const propertyForm = createDefaultFormForProperty(foundProperty);

      acc[currentPropertyName] = propertyForm;
    }

    return acc;
  }, {});
};

const findLayouts = (allLayouts, subjects) => {
  return subjects.reduce((acc, current) => {
    const foundLayout = allLayouts.find(({ uid }) => uid === current) || null;

    if (foundLayout) {
      acc[current] = foundLayout;
    }

    return acc;
  }, {});
};

const createDefaultCTFormFromLayout = ({ subjects }, actionArray, conditionArray) => {
  return actionArray.reduce((acc, current) => {
    const actionSubjects = current.subjects;

    const subjectLayouts = findLayouts(subjects, actionSubjects);

    if (isEmpty(subjectLayouts)) {
      return acc;
    }

    const contentTypesActions = Object.keys(subjectLayouts).reduce((acc2, currentCTUID) => {
      const { actionId, applyToProperties } = current;
      const conditionsForm = createConditionsForm(conditionArray);

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
  createConditionsForm,
  createDefaultFormForProperty,
  createDefaultPropertiesForm,
  findLayouts,
};
