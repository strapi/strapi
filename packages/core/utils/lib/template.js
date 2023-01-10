'use strict';

/**
 * Create a strict interpolation RegExp based on the given variables' name
 *
 * @param {string[]} allowedVariableNames - The list of allowed variables
 * @param {string} [flags] - The RegExp flags
 */
const createStrictInterpolationRegExp = (allowedVariableNames, flags) => {
  const oneOfVariables = allowedVariableNames.join('|');

  // 1. We need to match the delimiters: <%= ... %>
  // 2. We accept any number of whitespaces characters before and/or after the variable name: \s* ... \s*
  // 3. We only accept values from the variable list as interpolation variables' name: : (${oneOfVariables})
  return new RegExp(`<%=\\s*(${oneOfVariables})\\s*%>`, flags);
};

/**
 * Create a loose interpolation RegExp to match as many groups as possible
 *
 * @param {string} [flags] - The RegExp flags
 */
const createLooseInterpolationRegExp = (flags) => new RegExp(/<%=([\s\S]+?)%>/, flags);

module.exports = {
  createStrictInterpolationRegExp,
  createLooseInterpolationRegExp,
};
