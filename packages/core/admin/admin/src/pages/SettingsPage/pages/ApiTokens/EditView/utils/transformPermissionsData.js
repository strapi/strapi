import { flatten } from 'lodash';

const transformPermissionsData = (data) => {
  const layout = {
    allActionsIds: [],
    permissions: [],
  };

  layout.permissions = Object.keys(data).map((apiId) => ({
    apiId,
    label: apiId.split('::')[1],
    controllers: flatten(
      Object.keys(data[apiId].controllers).map((controller) => ({
        controller,
        actions: flatten(
          data[apiId].controllers[controller].map((action) => {
            const actionId = `${apiId}.${controller}.${action}`;

            if (apiId.includes('api::')) {
              layout.allActionsIds.push(actionId);
            }

            return {
              action,
              actionId,
            };
          })
        ),
      }))
    ),
  }));

  return layout;
};

export default transformPermissionsData;
