import { get, isEmpty } from 'lodash';
import { createArrayOfValues, getCheckboxState } from '../../../utils';

const generateCheckboxesActions = (availableActions, modifiedData, pathToData) => {
  return availableActions.map(({ actionId, isDisplayed, applyToProperties }) => {
    if (!isDisplayed) {
      return { actionId, hasSomeActionsSelected: false, isDisplayed };
    }

    const baseCheckboxNameArray = [...pathToData.split('..'), actionId];
    const checkboxNameArray = isEmpty(applyToProperties)
      ? [...baseCheckboxNameArray, 'enabled']
      : baseCheckboxNameArray;
    const checkboxName = checkboxNameArray.join('..');
    const conditionsValue = get(modifiedData, [...baseCheckboxNameArray, 'conditions'], null);

    const hasConditions = createArrayOfValues(conditionsValue).some(val => val);

    if (isEmpty(applyToProperties)) {
      const value = get(modifiedData, checkboxNameArray, false);

      // Since applyToProperties is empty such checkbox is not a parent checkbox, therefore hasAllActionsSelected is
      // equal to hasSomeActionsSelected
      return {
        actionId,
        checkboxName,
        hasAllActionsSelected: value,
        hasConditions,
        hasSomeActionsSelected: value,
        isDisplayed,
        isParentCheckbox: false,
      };
    }

    const mainData = get(modifiedData, checkboxNameArray, null);

    const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(mainData);

    return {
      actionId,
      checkboxName,
      hasAllActionsSelected,
      hasConditions,
      hasSomeActionsSelected,
      isDisplayed,
      isParentCheckbox: true,
    };
  });
};

export default generateCheckboxesActions;
