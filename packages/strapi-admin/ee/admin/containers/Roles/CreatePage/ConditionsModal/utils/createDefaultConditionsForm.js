import { get } from 'lodash';

const createConditionsForm = (conditions, valueObject) => {
  return conditions.reduce((acc, current) => {
    acc[current.id] = get(valueObject, current.id, false);

    return acc;
  }, {});
};

const createCategoryForm = (arrayOfOptions, valueObject) => {
  return arrayOfOptions.reduce((acc, current) => {
    const [categoryName, relatedConditions] = current;

    const conditionsForm = createConditionsForm(relatedConditions, valueObject);

    acc[categoryName] = conditionsForm;

    return acc;
  }, {});
};

const createDefaultConditionsForm = (
  actionsToDisplay,
  modifiedData,
  arrayOfOptionsGroupedByCategory
) => {
  return actionsToDisplay.reduce((acc, current) => {
    const valueFromModifiedData = get(
      modifiedData,
      [...current.pathToConditionsObject, 'conditions'],
      {}
    );

    const categoryDefaultForm = createCategoryForm(
      arrayOfOptionsGroupedByCategory,
      valueFromModifiedData
    );

    acc[current.pathToConditionsObject.join('..')] = categoryDefaultForm;

    return acc;
  }, {});
};

export default createDefaultConditionsForm;
export { createConditionsForm, createCategoryForm };
