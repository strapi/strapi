export default (policyCtx: { state: { user?: { roles?: Array<{ code?: string }> } } }) => {
  return policyCtx.state.user?.roles?.some((role) => role.code === 'strapi-super-admin') === true;
};
