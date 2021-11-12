'use strict';

module.exports = (...methods) => async data => {
  let res = data;

  for (const method of methods) {
    res = await method(res);
  }

  return res;
};
