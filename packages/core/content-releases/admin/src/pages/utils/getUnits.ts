const msPerMinute = 60 * 1000;
const msPerHour = msPerMinute * 60;
const msPerDay = msPerHour * 24;
const msPerMonth = msPerDay * 30;
const msPerYear = msPerDay * 365;

export const getUnits = (value: number) => {
  if (value < msPerMinute) {
    return { unit: 'second', value: -Math.round(value / 1000) };
  }
  if (value < msPerHour) {
    return { unit: 'minute', value: -Math.round(value / msPerMinute) };
  }
  if (value < msPerDay) {
    return { unit: 'hour', value: -Math.round(value / msPerHour) };
  }
  if (value < msPerMonth) {
    return { unit: 'day', value: -Math.round(value / msPerDay) };
  }
  if (value < msPerYear) {
    return { unit: 'month', value: -Math.round(value / msPerMonth) };
  }

  return { unit: 'year', value: -Math.round(value / msPerYear) };
};

export const countDays = (date: string) => {
  const currentDateInMillis = new Date().getTime();
  const startDateInMilliseconds = new Date(date).getTime();
  const elapsed = startDateInMilliseconds - currentDateInMillis;

  const { unit, value } = getUnits(-elapsed);

  return { unit, value };
};
