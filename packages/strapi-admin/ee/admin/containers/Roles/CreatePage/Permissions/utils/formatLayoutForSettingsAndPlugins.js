import { chain } from 'lodash';

const formatLayout = (layout, groupByKey) => {
  return chain(layout)
    .groupBy(groupByKey)
    .map((item, itemName) => ({
      category: itemName,
      childrenForm: chain(item)
        .groupBy('subCategory')
        .map((actions, subCategoryName) => ({ subCategoryName, actions }))
        .value(),
    }))
    .value();
};

export default formatLayout;
