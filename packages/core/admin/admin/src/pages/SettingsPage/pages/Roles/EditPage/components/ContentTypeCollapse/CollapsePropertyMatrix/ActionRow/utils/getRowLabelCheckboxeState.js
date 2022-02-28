import { get } from 'lodash';
import { getCheckboxState } from '../../../../utils';

/**
 * Returns a filtered array of actionId
 * @param {array<object>} propertyActions
 * @returns {string} actionId
 */
const getActionIdsFromPropertyActions = propertyActions => {
  const actionIds = propertyActions.reduce((acc, current) => {
    if (current.isActionRelatedToCurrentProperty) {
      acc.push(current.actionId);
    }

    return acc;
  }, []);

  return actionIds;
};

/**
 *
 * Returns the state of the left checkbox of a ActionRow main checkbox
 * @param {array} propertyActions
 * @param {object} modifiedData
 * @param {string} pathToContentType
 * @param {string} propertyToCheck
 * @param {string} targetKey
 * @returns {object}
 */
const getRowLabelCheckboxeState = (
  propertyActions,
  modifiedData,
  pathToContentType,
  propertyToCheck,
  targetKey
) => {
  const actionIds = getActionIdsFromPropertyActions(propertyActions);

  const data = actionIds.reduce((acc, current) => {
    const pathToData = [
      ...pathToContentType.split('..'),
      current,
      'properties',
      propertyToCheck,
      targetKey,
    ];
    const mainData = get(modifiedData, pathToData, false);

    acc[current] = mainData;

    return acc;
  }, {});

  return getCheckboxState(data);
};

export default getRowLabelCheckboxeState;
export { getActionIdsFromPropertyActions };
