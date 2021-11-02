export const parseDate = date => {
  const timestamp = Date.parse(date);

  if (Number.isNaN(timestamp) === false) {
    return new Date(timestamp);
  }

  return null;
};
