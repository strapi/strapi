export const formatDuration = durationInSecond => {
  const formatter = new Intl.DateTimeFormat('default', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });

  const date = new Date(1970, 0, 1);
  date.setSeconds(durationInSecond);

  return formatter.format(date);
};
