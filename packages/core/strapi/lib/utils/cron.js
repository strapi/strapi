'use strict';

const { isEmpty, negate } = require('lodash/fp');

const integerRegex = /^\d+$/;
const stepRegex = /^\*\/\d+$/;
const components = [
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

  const { limit, zeroBasedIndices, functionName } = components[index];
  const offset = +!zeroBasedIndices;
  const currentValue = date[functionName]();

  if (integerRegex.test(component)) {
    return ((Number.parseInt(component, 10) + currentValue) % limit) + offset;
  }

  if (stepRegex.test(component)) {
    const [, step] = component.split('/');
    const frequency = Math.floor(limit / step);
    const list = Array.from({ length: frequency }, (_, index) => index * step);
    return list.map((value) => ((value + currentValue) % limit) + offset).sort((a, b) => a - b);
  }

  // Unsupported syntax, fallback to '*'
  return '*';
};

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
