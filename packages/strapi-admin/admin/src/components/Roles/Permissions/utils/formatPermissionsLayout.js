import { chain } from 'lodash';

const formatPermissionsLayout = (layout, groupByKey) => {
  return chain(layout)
    .groupBy(groupByKey)
    .map((item, itemName) => ({
      category: itemName,
      subCategories: chain(item)
        .groupBy('subCategory')
        .map((actions, subCategoryName) => ({ subCategory: subCategoryName, actions }))
        .value(),
    }))
    .value();
};

export default formatPermissionsLayout;
