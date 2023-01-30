'use strict';

const { isEmpty, negate } = require('lodash/fp');

const INTEGER_REGEX = /^\d+$/;
const STEP_REGEX = /^\*\/\d+$/;
const COMPONENTS = [
  { limit: 60, zeroBasedIndices: true, functionName: 'getSeconds' },
  { limit: 60, zeroBasedIndices: true, functionName: 'getMinutes' },
  { limit: 24, zeroBasedIndices: true, functionName: 'getHours' },
  { limit: 31, zeroBasedIndices: false, functionName: 'getDate' },
  { limit: 12, zeroBasedIndices: false, functionName: 'getMonth' },
  { limit: 7, zeroBasedIndices: true, functionName: 'getDay' },
];

const shift = (component, index, date) => {
  if (component === '*') {
    return '*';
  }

  const { limit, zeroBasedIndices, functionName } = COMPONENTS[index];
  const offset = +!zeroBasedIndices;
  const currentValue = date[functionName]();

  if (INTEGER_REGEX.test(component)) {
    return ((Number.parseInt(component, 10) + currentValue) % limit) + offset;
  }

  if (STEP_REGEX.test(component)) {
    const [, step] = component.split('/');
    const frequency = Math.floor(limit / step);
    const list = Array.from({ length: frequency }, (_, index) => index * step);
    return list.map((value) => ((value + currentValue) % limit) + offset).sort((a, b) => a - b);
  }

  // Unsupported syntax
  return component;
};

/**
 * Simulate an interval by shifting a cron expression using the specified date.
 * @param {string} rule A cron expression you want to shift.
 * @param {Date} date The date that's gonna be used as the start of the "interval", it defaults to now.
 * @returns The shifted cron expression.
 */
const shiftCronExpression = (rule, date = new Date()) => {
  const components = rule.trim().split(' ').filter(negate(isEmpty));
  const secondsIncluded = components.length === 6;
  return components
    .map((component, index) => shift(component, secondsIncluded ? index : index + 1, date))
    .join(' ');
};

module.exports = {
  shiftCronExpression,
};
