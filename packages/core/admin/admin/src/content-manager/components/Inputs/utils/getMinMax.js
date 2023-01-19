/**
 * Get the minimum and maximum limits for an input
 * @type { (fieldSchema: { minLength?: number|string; maxLength?: number|string; max?: number|string; min?: number|string } ) => { inputMaximum: number; inputMinimum: number } }
 */
const getMinMax = (fieldSchema) => {
  const { minLength, maxLength, max, min } = fieldSchema;

  let inputMinimum;
  let inputMaximum;

  const parsedMin = parseInt(min, 10);
  const parsedMinLength = parseInt(minLength, 10);

  if (!Number.isNaN(parsedMin)) {
    inputMinimum = parsedMin;
  } else if (!Number.isNaN(parsedMinLength)) {
    inputMinimum = parsedMinLength;
  }

  const parsedMax = parseInt(max, 10);
  const parsedMaxLength = parseInt(maxLength, 10);

  if (!Number.isNaN(parsedMax)) {
    inputMaximum = parsedMax;
  } else if (!Number.isNaN(parsedMaxLength)) {
    inputMaximum = parsedMaxLength;
  }

  return { inputMaximum, inputMinimum };
};

export default getMinMax;
