export const countDays = (date: string) => {
  const currentDateInMillis = new Date().getTime();
  const startDateInMilliseconds = new Date(date).getTime();
  const timeDiff = currentDateInMillis - startDateInMilliseconds;

  const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  return daysPassed;
};
