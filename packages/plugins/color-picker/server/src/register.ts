export const register = ({ strapi }: any) => {
  strapi.customFields.register({
    name: 'color',
    plugin: 'color-picker',
    type: 'string',
  });
};
