'use strict';

const shiftHours = (date, step) => {
  const frequency = 24 / step;
  const list = Array.from({ length: frequency }, (_, index) => index * step);
  const hour = date.getHours();
  return list.map((value) => (value + hour) % 24).sort((a, b) => a - b);
};

// TODO: This should be transformed into a cron expression shifter that could be reused in other places
// For now it's tailored to the license check cron, scheduled every 12h
const getRecurringCronExpression = (date = new Date()) =>
  `${date.getMinutes()} ${shiftHours(date, 12)} * * *`;

module.exports = {
  getRecurringCronExpression,
};
