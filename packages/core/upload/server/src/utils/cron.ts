const getWeeklyCronScheduleAt = (date: Date) =>
  `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} * * ${date.getDay()}`;

export { getWeeklyCronScheduleAt };
