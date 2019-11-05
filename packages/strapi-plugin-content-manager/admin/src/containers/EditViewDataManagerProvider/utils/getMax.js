/*
 *  Get the max _temp__id from a List
 *  @param {List} arr
 *  @returns {Int}
 */
const getMax = arr => {
  if (arr.size === 0) {
    return -1;
  }

  return Math.max.apply(Math, arr.toJS().map(o => o._temp__id));
};

export default getMax;
