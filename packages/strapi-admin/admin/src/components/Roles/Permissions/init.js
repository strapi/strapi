const init = (state, permissionsLayout, permissions, role) => {
  return {
    ...state,
    ...permissions,
    permissionsLayout,
    isSuperAdmin: role && role.code === 'strapi-super-admin',
  };
};

export default init;
