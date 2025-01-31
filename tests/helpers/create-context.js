'use strict';

module.exports = ({ params = {}, query = {}, body = {} }, overrides = {}) => ({
  params,
  query,
  request: {
    query,
    body,
  },
  ...overrides,
});
