import transformPermissionsData from '../transformPermissionsData';
import { data } from './dataMock';

describe('ADMIN | Container | SettingsPage | ApiTokens | EditView | utils | transformPermissionsData', () => {
  it('should return transformed data correctly', () => {
    expect(transformPermissionsData(data.data)).toEqual({
      allActionsIds: [
        'api::address.address.find',
        'api::address.address.findOne',
        'api::category.category.find',
        'api::category.category.findOne',
        'api::category.category.create',
        'api::category.category.update',
        'api::category.category.delete',
        'api::category.category.createLocalization',
      ],
      permissions: [
        {
          subjectId: 'api::address',
          label: 'address',
          controllers: [
            {
              controller: 'address',
              actions: [
                {
                  action: 'find',
                  actionId: 'api::address.address.find',
                },
                {
                  action: 'findOne',
                  actionId: 'api::address.address.findOne',
                },
              ],
            },
          ],
        },
        {
          subjectId: 'api::category',
          label: 'category',
          controllers: [
            {
              controller: 'category',
              actions: [
                {
                  action: 'find',
                  actionId: 'api::category.category.find',
                },
                {
                  action: 'findOne',
                  actionId: 'api::category.category.findOne',
                },
                {
                  action: 'create',
                  actionId: 'api::category.category.create',
                },
                {
                  action: 'update',
                  actionId: 'api::category.category.update',
                },
                {
                  action: 'delete',
                  actionId: 'api::category.category.delete',
                },
                {
                  action: 'createLocalization',
                  actionId: 'api::category.category.createLocalization',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
