import { createArrayOfValues } from '../../../utils';

const getConditionsButtonState = valueObj => {
  const relatedData = Object.entries(valueObj).reduce((acc, current) => {
    const [catName, { conditions }] = current;

    acc[catName] = conditions;

    return acc;
  }, {});

  const arrayOfValues = createArrayOfValues(relatedData);

  return arrayOfValues.some(val => val);
};

export default getConditionsButtonState;
