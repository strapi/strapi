/**
 * Creates an object with keys corresponding to the categoryName and leafs to false except for the first category
 *
 * @param {any[]} arrayOfCategories
 */
const createCollapsesObject = arrayOfCategories =>
  arrayOfCategories.reduce((acc, current, index) => {
    acc[current[0]] = index === 0;

    return acc;
  }, {});

export default createCollapsesObject;
