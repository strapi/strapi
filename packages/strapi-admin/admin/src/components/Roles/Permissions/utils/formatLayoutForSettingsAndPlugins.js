import { chain } from 'lodash';

const replaceName = name => name.split(' ').join('-');

const formatLayout = (layout, groupByKey) => {
  return chain(layout)
    .groupBy(groupByKey)
    .map((item, itemName) => ({
      category: itemName,
      categoryId: replaceName(itemName),
      childrenForm: chain(item)
        .groupBy('subCategory')
        .map((actions, subCategoryName) => ({
          subCategoryName,
          subCategoryId: replaceName(subCategoryName),
          actions,
        }))
        .value(),
    }))
    .value();
};

export default formatLayout;
