'use strict';

const { trim } = require('lodash/fp');
const {
  template: { createLooseInterpolationRegExp, createStrictInterpolationRegExp },
} = require('@strapi/utils');

const invalidPatternsRegexes = [
  // Ignore "evaluation" patterns: <% ... %>
  /<%[^=]([\s\S]*?)%>/m,
  // Ignore basic string interpolations
  /\${([^{}]*)}/m,
];

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

  // eslint-disable-next-line no-cond-assign
  while ((match = regexPatternWithGlobal.exec(src))) {
    const [, group] = match;

    matches.push(trim(group));
  }

  return matches;
};

const isValidEmailTemplate = (template) => {
  // Check for known invalid patterns
  for (const reg of invalidPatternsRegexes) {
    if (reg.test(template)) {
      return false;
    }
  }

  const interpolation = {
    // Strict interpolation pattern to match only valid groups
    strict: createStrictInterpolationRegExp(authorizedKeys),
    // Weak interpolation pattern to match as many group as possible.
    loose: createLooseInterpolationRegExp(),
  };

  // Compute both strict & loose matches
  const strictMatches = matchAll(interpolation.strict, template);
  const looseMatches = matchAll(interpolation.loose, template);

  // If we have more matches with the loose RegExp than with the strict one,
  // then it means that at least one of the interpolation group is invalid
  // Note: In the future, if we wanted to give more details for error formatting
  // purposes, we could return the difference between the two arrays
  if (looseMatches.length > strictMatches.length) {
    return false;
  }

  return true;
};

module.exports = {
  isValidEmailTemplate,
};
