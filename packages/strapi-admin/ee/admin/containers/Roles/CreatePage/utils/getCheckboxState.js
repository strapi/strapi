import createArrayOfValues from './createArrayOfValues';

const getCheckboxState = data => {
  const arrayOfValues = createArrayOfValues(data);

  if (!arrayOfValues.length) {
    return { hasAllActionsSelected: false, hasSomeActionsSelected: false };
  }

  const hasAllActionsSelected = arrayOfValues.every(val => val);
  const hasSomeActionsSelected = arrayOfValues.some(val => val) && !hasAllActionsSelected;

  return { hasAllActionsSelected, hasSomeActionsSelected };
};

export default getCheckboxState;
