const { includes } = require('lodash');
const auth = require('utils/auth').default;

module.exports = function willSecure() {
  const {
    props: {
      showLeftMenu,
      hideLeftMenu,
      location: { pathname },
      history,
      store,
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

    return cb();
  }

  if (!includes(nonProtectedURLs, pathname)) {
    hideLeftMenu();
    history.push(redirectEndPoint);

    return cb();
  }

  if (
    pathname === '/plugins/users-permissions/auth/login' ||
    pathname === '/plugins/users-permissions/auth/register'
  ) {
    hideLeftMenu();
    history.push(redirectEndPoint);

    return cb();
  }

  showLeftMenu();

  return cb();
};
