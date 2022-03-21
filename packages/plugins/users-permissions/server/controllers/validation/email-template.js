'use strict';

const _ = require('lodash');

const invalidPatternsRegexes = [/<%[^=]([^<>%]*)%>/m, /\${([^{}]*)}/m];
const authorizedKeys = [
  'URL',
  'ADMIN_URL',
  'SERVER_URL',
  'CODE',
  'USER',
  'USER.email',
  'USER.username',
  'TOKEN',
];

const matchAll = (pattern, src) => {
  const matches = [];
  let match;

  const regexPatternWithGlobal = RegExp(pattern, 'g');
  while ((match = regexPatternWithGlobal.exec(src))) {
    const [, group] = match;

    matches.push(_.trim(group));
  }
  return matches;
};

const isValidEmailTemplate = template => {
  for (let reg of invalidPatternsRegexes) {
    if (reg.test(template)) {
      return false;
    }
  }

  const matches = matchAll(/<%=([^<>%=]*)%>/, template);
  for (const match of matches) {
    if (!authorizedKeys.includes(match)) {
      return false;
    }
  }

  return true;
};

module.exports = {
  isValidEmailTemplate,
};
