const createCollapsesObject = arrayOfCategories =>
  arrayOfCategories.reduce((acc, current, index) => {
    acc[current[0]] = index === 0;

    return acc;
  }, {});

export default createCollapsesObject;
