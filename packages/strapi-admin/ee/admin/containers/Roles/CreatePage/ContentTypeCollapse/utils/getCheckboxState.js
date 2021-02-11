import { get } from 'lodash';
import createArrayOfValues from './createArrayOfValues';

const getValueFromModifiedData = (pathToData, modifiedData) => {
  const data = get(modifiedData, pathToData, {});

  return createArrayOfValues(data);
};

const getCheckboxState = (pathToData, modifiedData) => {
  const arrayOfValues = getValueFromModifiedData(pathToData, modifiedData);

  const hasAllActionsSelected = arrayOfValues.every(val => val);
  const hasSomeActionsSelected = arrayOfValues.some(val => val) && !hasAllActionsSelected;

  return { hasAllActionsSelected, hasSomeActionsSelected };
};

export default getCheckboxState;
