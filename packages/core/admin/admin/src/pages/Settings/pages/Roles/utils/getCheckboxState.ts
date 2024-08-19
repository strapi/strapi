import { createArrayOfValues } from './createArrayOfValues';
import { removeConditionKeyFromData } from './removeConditionKeyFromData';

interface RecursiveRecordOfBooleans extends Record<string, boolean | RecursiveRecordOfBooleans> {}

const getCheckboxState = (dataObj: RecursiveRecordOfBooleans) => {
  const dataWithoutCondition = removeConditionKeyFromData(dataObj);

  const arrayOfValues = createArrayOfValues(dataWithoutCondition);

  if (!arrayOfValues.length) {
    return { hasAllActionsSelected: false, hasSomeActionsSelected: false };
  }

  const hasAllActionsSelected = arrayOfValues.every((val) => val);
  const hasSomeActionsSelected = arrayOfValues.some((val) => val) && !hasAllActionsSelected;

  return { hasAllActionsSelected, hasSomeActionsSelected };
};

export { getCheckboxState };
export type { RecursiveRecordOfBooleans };
