import groupBy from 'lodash/groupBy';

import { SettingPermission } from '../../../../../../../shared/contracts/permissions';

interface GenericLayout<TLayout> {
  category: string;
  categoryId: string;
  childrenForm: Array<{
    subCategoryName: string;
    subCategoryId: string;
    actions: TLayout[];
  }>;
}

const formatLayout = <TLayout extends Omit<SettingPermission, 'category'>>(
  layout: TLayout[],
  groupByKey: keyof TLayout
): GenericLayout<TLayout>[] => {
  return Object.entries(groupBy(layout, groupByKey)).map(([itemName, item]) => ({
    category: itemName,
    categoryId: itemName.split(' ').join('-'),
    childrenForm: Object.entries(groupBy(item, 'subCategory')).map(
      ([subCategoryName, actions]) => ({
        subCategoryName,
        subCategoryId: subCategoryName.split(' ').join('-'),
        actions,
      })
    ),
  }));
};

export { formatLayout };
export type { GenericLayout };
