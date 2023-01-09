export const registerAdminTransferActions = async (strapi: Strapi.Strapi) => {
  const actions = [
    {
      uid: 'transfer.push',
      displayName: 'Transfer data to the current project',
      pluginName: 'admin',
      section: 'settings',
      category: 'data management',
      subCategory: 'Data transfer',
    },
    {
      uid: 'transfer.pull',
      displayName: 'Transfer data from the current project',
      pluginName: 'admin',
      section: 'settings',
      category: 'data management',
      subCategory: 'Data transfer',
    },
  ];

  await strapi.service<any>('admin::permission').actionProvider.registerMany(actions);
};
