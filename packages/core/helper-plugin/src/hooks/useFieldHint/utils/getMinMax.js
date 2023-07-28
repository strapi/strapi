/**
 * Get the minimum and maximum limits for an input
 * @type {
 * (fieldSchema: { minLength?: number|string; maxLength?: number|string; max?: number|string; min?: number|string } )
 * => { maximum: number; minimum: number } }
 */
const getMinMax = (fieldSchema) => {
  if (!fieldSchema) {
    return { maximum: undefined, minimum: undefined };
  }

  const { minLength, maxLength, max, min } = fieldSchema;

  let minimum;
  let maximum;

  const parsedMin = parseInt(min, 10);
  const parsedMinLength = parseInt(minLength, 10);

  if (!Number.isNaN(parsedMin)) {
    minimum = parsedMin;
  } else if (!Number.isNaN(parsedMinLength)) {
    minimum = parsedMinLength;
  }

  const parsedMax = parseInt(max, 10);
  const parsedMaxLength = parseInt(maxLength, 10);

  if (!Number.isNaN(parsedMax)) {
    maximum = parsedMax;
  } else if (!Number.isNaN(parsedMaxLength)) {
    maximum = parsedMaxLength;
  }

  return { maximum, minimum };
};

export default getMinMax;
