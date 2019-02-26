const { includes } = require('lodash');
const auth = require('utils/auth').default;

module.exports = function willSecure() {
  const {
    props: {
      hideLeftMenu,
      history,
      location: { pathname },
      setAppSecured,
      showLeftMenu,
      store,
      unsetAppSecured,
    },
  } = this;

  const cb = () => this.setState({
    shouldSecureAfterAllPluginsAreMounted: false,
  });

  const initializerReducer = store
    .getState()
    .getIn(['users-permissions_initializer']);

  const nonProtectedURLs = ['/plugins/users-permissions/auth'];
  const redirectEndPoint = initializerReducer.get('hasAdminUser')
    ? '/plugins/users-permissions/auth/login'
    : '/plugins/users-permissions/auth/register';

  if (auth.getToken()) {
    showLeftMenu();
    setAppSecured();

    return cb();
  }

  if (!includes(nonProtectedURLs, pathname)) {
    hideLeftMenu();
    unsetAppSecured();
    history.push(redirectEndPoint);

    return cb();
  }

  if (
    pathname === '/plugins/users-permissions/auth/login' ||
    pathname === '/plugins/users-permissions/auth/register'
  ) {
    hideLeftMenu();
    unsetAppSecured();
    history.push(redirectEndPoint);

    return cb();
  }

  showLeftMenu();
  setAppSecured();

  return cb();
};
