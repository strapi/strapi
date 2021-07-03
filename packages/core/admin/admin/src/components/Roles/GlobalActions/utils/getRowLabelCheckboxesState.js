import { get } from 'lodash';
import { getCheckboxState, removeConditionKeyFromData } from '../../utils';

const getActionsIds = array => array.map(({ actionId }) => actionId);

const getRelatedActionIdData = (actionIdArray, dataObj) => {
  return actionIdArray.reduce((acc, actionId) => {
    Object.keys(dataObj).forEach(ctUid => {
      const actionIdData = get(dataObj, [ctUid, actionId], {});

      const actionIdState = { [ctUid]: removeConditionKeyFromData(actionIdData) };

      if (!acc[actionId]) {
        acc[actionId] = actionIdState;
      } else {
        acc[actionId] = { ...acc[actionId], ...actionIdState };
      }
    });

    return acc;
  }, {});
};

const getCheckboxesState = (properties, modifiedData) => {
  const actionsIds = getActionsIds(properties);
  const relatedActionsData = getRelatedActionIdData(actionsIds, modifiedData);

  const checkboxesState = Object.keys(relatedActionsData).reduce((acc, current) => {
    acc[current] = getCheckboxState(relatedActionsData[current]);

    return acc;
  }, {});

  return checkboxesState;
};

export default getCheckboxesState;
export { getActionsIds, getRelatedActionIdData };
