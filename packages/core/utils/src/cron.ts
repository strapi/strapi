const ONE_WEEK: number = 7 * 24 * 60 * 60 * 1000;
const getWeeklyCronScheduleAt = (date: Date): string => `0 * * * * *`;
// TODO revert to this
//  `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} * * ${date.getDay()}`;

export { ONE_WEEK, getWeeklyCronScheduleAt };
