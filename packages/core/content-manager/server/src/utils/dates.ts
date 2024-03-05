/**
 * TODO: Remove this and make updatedAt dates be equal when publishing on the document-engine
 * Compares two dates and returns true if the absolute difference between them is less than or equal to the specified threshold.
 * @param date1 The first date to compare.
 * @param date2 The second date to compare.
 * @param threshold The threshold in milliseconds.
 * @returns True if the absolute difference between the dates is less than or equal to the threshold, false otherwise.
 */
export const areDatesEqual = (
  date1: Date | string | null,
  date2: Date | string | null,
  threshold: number
): boolean => {
  if (!date1 || !date2) {
    return false;
  }

  const time1 = new Date(date1).getTime();
  const time2 = new Date(date2).getTime();
  const difference = Math.abs(time1 - time2);

  return difference <= threshold;
};
