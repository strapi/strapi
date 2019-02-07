const { includes } = require('lodash');
const auth = require('utils/auth').default;

module.exports = function willSecure(props, store, cb = () => {}) {
  const {
    showLeftMenu,
    hideLeftMenu,
    location: { pathname },
    history,
  } = props;

  const initializerReducer = store
    .getState()
    .getIn(['users-permissions-initializer']);

  const nonProtectedURLs = '/plugins/users-permissions/auth';
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
