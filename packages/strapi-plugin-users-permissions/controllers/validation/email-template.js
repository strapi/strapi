'use strict';

const _ = require('lodash');

const invalidPatternsRegexes = [/<%[^=]([^<>%]*)%>/m, /\${([^{}]*)}/m];
const authorizedKeys = ['URL', 'CODE', 'USER', 'USER.email', 'USER.username', 'TOKEN'];

const isValidEmailTemplate = template => {
  for (let reg of invalidPatternsRegexes) {
    if (reg.test(template)) {
      return false;
    }
  }

  const matches = Array.from(template.matchAll(/<%=([^<>%=]*)%>/g));
  for (let match of matches) {
    const [, group] = match;
    const trimGroup = _.trim(group);

    if (!authorizedKeys.includes(trimGroup)) {
      return false;
    }
  }

  return true;
};

module.exports = {
  isValidEmailTemplate,
};
