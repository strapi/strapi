/**
 * Get the minimum and maximum limits for an input
 * @type { (fieldSchema: { minLength?: number; maxLength?: number; max?: number; min?: number } ) => { inputMaximum: number; inputMinimum: number } }
 */
const getMinMax = (fieldSchema) => {
  const { minLength, maxLength, max, min } = fieldSchema;

  let inputMinimum;
  let inputMaximum;

  if (typeof min === 'number') {
    inputMinimum = min;
  } else if (typeof minLength === 'number') {
    inputMinimum = minLength;
  }

  if (typeof max === 'number') {
    inputMaximum = max;
  } else if (typeof maxLength === 'number') {
    inputMaximum = maxLength;
  }

  return { inputMaximum, inputMinimum };
};

export default getMinMax;
