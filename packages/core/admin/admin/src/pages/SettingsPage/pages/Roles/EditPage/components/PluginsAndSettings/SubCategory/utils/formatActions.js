import { get } from 'lodash';
import { createArrayOfValues } from '../../../utils';

/**
 * We need to format the actions to an array of object that matches the ConditionsModal action's props
 * @param {array<object>} actions
 * @config {string} displayName the displayName of the action
 * @config {string} action required, the name of the action
 * @param {object} modifiedData
 * @param {array} pathToData
 */
const formatActions = (actions, modifiedData, pathToData) => {
  return actions.map(action => {
    const checkboxName = [...pathToData, action.action, 'properties', 'enabled'];
    const checkboxValue = get(modifiedData, checkboxName, false);
    const conditionValue = get(modifiedData, [...pathToData, action.action, 'conditions'], {});
    const hasConditions = createArrayOfValues(conditionValue).some(val => val);

    return {
      ...action,
      isDisplayed: checkboxValue,
      checkboxName: checkboxName.join('..'),
      hasSomeActionsSelected: checkboxValue,
      value: checkboxValue,
      hasConditions,
      label: action.displayName,
      actionId: action.action,
      pathToConditionsObject: [...pathToData, action.action],
    };
  });
};
export default formatActions;
