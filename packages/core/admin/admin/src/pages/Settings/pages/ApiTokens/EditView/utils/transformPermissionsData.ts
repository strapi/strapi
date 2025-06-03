import { ContentApiPermission } from '../../../../../../../../shared/contracts/content-api/permissions';

interface Layout {
  allActionsIds: string[];
  permissions: {
    apiId: string;
    label: string;
    controllers: { controller: string; actions: { action: string; actionId: string }[] }[];
  }[];
}

export const transformPermissionsData = (data: ContentApiPermission) => {
  const layout: Layout = {
    allActionsIds: [],
    permissions: [],
  };

  layout.permissions = Object.entries(data).map(([apiId, permission]) => ({
    apiId,
    label: apiId.split('::')[1],
    controllers: Object.keys(permission.controllers)
      .map((controller) => ({
        controller,
        actions:
          controller in permission.controllers
            ? permission.controllers[controller]
                .map((action: ContentApiPermission['controllers']) => {
                  const actionId = `${apiId}.${controller}.${action}`;

                  if (apiId.includes('api::')) {
                    layout.allActionsIds.push(actionId);
                  }

                  return {
                    action,
                    actionId,
                  };
                })
                .flat()
            : [],
      }))
      .flat(),
  }));

  return layout;
};
