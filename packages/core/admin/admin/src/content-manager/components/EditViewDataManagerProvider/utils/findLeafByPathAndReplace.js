import set from 'lodash/set';

/**
 * @param {string} endpath – the final path that you're looking to replace
 * @returns {function} findLeafReducer – a function that will be used in the reduce
 */
export const findLeafByPathAndReplace = (endpath, replaceWith) => {
  /**
   * @param {object} acc – the data tree
   * @param {*} curr – string, this _could_ be used to index the accumulator
   * @param {*} ind - your current index of the array you're reducing
   * @returns {object} – the new object with the replaced values
   */
  const findLeafAndReplace = (acc, curr, ind, currentArr) => {
    /**
     * Because we're returning the `accumulator[current]` at the bottom
     * and some components may not exist at this point, we check if `accumulator`
     * exists before trying to access & replace properties.
     */
    if (!acc) return acc;

    /**
     * If this is the last item in the array of paths
     * then we assume it's a leaf and we can replace it.
     */
    if (ind === currentArr.length - 1 && endpath === curr) {
      set(acc, curr, replaceWith);

      return acc;
    }

    /**
     * If the value of the accumulator[current] is an array
     * then we need to loop over it and call the reducer again
     * this time with each array item being the accumulator.
     */
    if (Array.isArray(acc[curr])) {
      acc[curr].forEach((item) => {
        currentArr.slice(ind + 1).reduce(findLeafAndReplace, item);
      });
    }

    /**
     * accumulator[current]return accumulator[current] instead of the main accumulator,
     * this will stop the same keys overwrite the wrong objects
     */
    return acc[curr];
  };

  return findLeafAndReplace;
};
