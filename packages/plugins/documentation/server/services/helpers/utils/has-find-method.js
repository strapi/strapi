'use strict';

const hasFindMethod = (handler) => handler.split('.').pop() === 'find';

module.exports = hasFindMethod;
