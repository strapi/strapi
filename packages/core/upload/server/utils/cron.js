'use strict';

const getWeeklyCronScheduleAt = date =>
  `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} * * ${date.getDay()}`;

module.exports = {
  getWeeklyCronScheduleAt,
};
