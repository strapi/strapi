import groupBy from 'lodash/groupBy';

const replaceName = (name) => name.split(' ').join('-');

const formatLayout = (layout, groupByKey) => {
  return Object.entries(groupBy(layout, groupByKey)).map(([itemName, item]) => ({
    category: itemName,
    categoryId: replaceName(itemName),
    childrenForm: Object.entries(groupBy(item, 'subCategory')).map(
      ([subCategoryName, actions]) => ({
        subCategoryName,
        subCategoryId: replaceName(subCategoryName),
        actions,
      })
    ),
  }));
};

export default formatLayout;
