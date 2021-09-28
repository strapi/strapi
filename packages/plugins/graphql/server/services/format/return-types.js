'use strict';

module.exports = () => ({
  /**
   * @param {object} value
   * @param {object} info
   * @param {object} info.args
   * @param {string} info.resourceUID
   */
  toEntityResponse(value, info = {}) {
    const { args = {}, resourceUID } = info;

    return { value, info: { args, resourceUID } };
  },

  /**
   * @param {object[]} nodes
   * @param {object} info
   * @param {object} info.args
   * @param {string} info.resourceUID
   */
  toEntityResponseCollection(nodes, info = {}) {
    const { args = {}, resourceUID } = info;

    return { nodes, info: { args, resourceUID } };
  },
});
