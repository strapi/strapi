import { get } from 'lodash';
import { getCheckboxState } from '../../../../utils';

const getActionIdsFromPropertyActions = propertyActions => {
  const actionIds = propertyActions.reduce((acc, current) => {
    if (current.isActionRelatedToCurrentProperty) {
      acc.push(current.actionId);
    }

    return acc;
  }, []);

  return actionIds;
};

const getRowLabelCheckboxeState = (
  propertyActions,
  modifiedData,
  pathToContentType,
  propertyToCheck,
  targetKey
) => {
  const actionIds = getActionIdsFromPropertyActions(propertyActions);

  const data = actionIds.reduce((acc, current) => {
    const pathToData = [...pathToContentType.split('..'), current, propertyToCheck, targetKey];
    const mainData = get(modifiedData, pathToData, false);

    acc[current] = mainData;

    return acc;
  }, {});

  return getCheckboxState(data);
};

export default getRowLabelCheckboxeState;
export { getActionIdsFromPropertyActions };
