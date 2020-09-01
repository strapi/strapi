const init = (state, permissionsLayout, permissions, role) => {
  return {
    ...state,
    ...permissions,
    permissionsLayout,
    initialData: permissions,
    isSuperAdmin: role && role.code === 'strapi-super-admin',
  };
};

export default init;
