import { get } from 'lodash';
import { getCheckboxState, removeConditionKeyFromData } from '../../utils';

const getCheckboxesState = (properties, modifiedData) => {
  const actionsIds = properties.map(({ actionId }) => actionId);

  const relatedActionsData = actionsIds.reduce((acc, actionId) => {
    Object.keys(modifiedData).forEach(ctUid => {
      const actionIdData = get(modifiedData, [ctUid, actionId], {});

      const actionIdState = { [ctUid]: removeConditionKeyFromData(actionIdData) };

      if (!acc[actionId]) {
        acc[actionId] = actionIdState;
      } else {
        acc[actionId] = { ...acc[actionId], ...actionIdState };
      }
    });

    return acc;
  }, {});

  const checkboxesState = Object.keys(relatedActionsData).reduce((acc, current) => {
    acc[current] = getCheckboxState(relatedActionsData[current]);

    return acc;
  }, {});

  return checkboxesState;
};

export default getCheckboxesState;
