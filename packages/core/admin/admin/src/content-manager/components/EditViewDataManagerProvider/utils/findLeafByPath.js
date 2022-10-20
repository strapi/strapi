import set from 'lodash/set';

/**
 * @param {string} endpath – the final path that you're looking to replace
 * @returns {function} findLeafReducer – a function that will be used in the reduce
 */
export const findLeafByPath = (path) => {
  /**
   * @param {object} acc – the data tree
   * @param {*} curr – string, this _could_ be used to index the accumulator
   * @param {*} ind - your current index of the array you're reducing
   * @returns {object} – the new object with the replaced values
   */
  const findLeaf = (acc, curr, ind, currentArr) => {
    /**
     * If this is the last item in the array of paths
     * and the current path is not undefined in the accumulator
     * then we assume it's a leaf and we can replace it.
     */
    if (path === curr && acc[curr]) {
      set(acc, curr, []);

      return acc;
    }

    /**
     * If the value of the accumulator[current] is an array
     * then we need to loop over it and call the reducer again
     * this time with each array item being the accumulator.
     */
    if (Array.isArray(acc[curr])) {
      acc[curr].forEach((item) => {
        currentArr.slice(ind + 1).reduce(findLeaf, item);
      });
    }

    /**
     * If the value of the accumulator[current] exists return this
     * instead of the main accumulator, this will stop the same keys overwrite
     * the wrong objects
     */
    return acc[curr] ? acc[curr] : acc;
  };

  return findLeaf;
};
