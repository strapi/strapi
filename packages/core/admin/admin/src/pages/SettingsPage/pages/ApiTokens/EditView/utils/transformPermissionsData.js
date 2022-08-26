import { flatten } from 'lodash';

const transformPermissionsData = (data) => {
  const layout = {
    allActionsIds: [],
    permissions: [],
  };

  layout.permissions = Object.keys(data).map((subjectId) => ({
    subjectId,
    label: subjectId.split('::')[1],
    controllers: flatten(
      Object.keys(data[subjectId].controllers).map((controller) => ({
        controller,
        actions: flatten(
          data[subjectId].controllers[controller].map((action) => {
            const actionId = `${subjectId}.${controller}.${action}`;
            layout.allActionsIds.push(actionId);

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
