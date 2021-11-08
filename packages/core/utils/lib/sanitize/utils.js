'use strict';

const pipeAsync = (...methods) => async data => {
  let res = data;

  for (const method of methods) {
    res = await method(res);
  }

  return res;
};

module.exports = {
  pipeAsync,
};
