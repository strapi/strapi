export default (policyCtx: any) => {
  return Boolean(policyCtx.state.isAuthenticated);
};
