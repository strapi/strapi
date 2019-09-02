import { auth } from 'strapi-helper-plugin';

function willSecure() {
  const {
    props: {
      hideLeftMenu,
      hideLogout,
      history,
      location: { pathname },
      resetLocaleDefaultClassName,
      setAppSecured,
      setLocaleCustomClassName,
      showLeftMenu,
      showLogout,
      store,
      unsetAppSecured,
    },
  } = this;

  const cb = () =>
    this.setState({
      shouldSecureAfterAllPluginsAreMounted: false,
    });

  const initializerReducer = store
    .getState()
    .getIn(['users-permissions_initializer']);

  const nonProtectedURLs = '/plugins/users-permissions/auth';
  const redirectEndPoint = initializerReducer.get('hasAdminUser')
    ? '/plugins/users-permissions/auth/login'
    : '/plugins/users-permissions/auth/register';

  if (auth.getToken()) {
    resetLocaleDefaultClassName(); // NOTE: Temporary should be removed when we switch to administrators
    setAppSecured();
    showLeftMenu();
    showLogout();

    return cb();
  }

  if (!pathname.includes(nonProtectedURLs)) {
    hideLeftMenu();
    hideLogout();
    setLocaleCustomClassName('localeDropdownMenuNotLogged'); // NOTE: Temporary should be removed when we switch to administrators
    unsetAppSecured();
    history.push(redirectEndPoint);

    return cb();
  }

  if (
    pathname === '/plugins/users-permissions/auth/login' ||
    pathname === '/plugins/users-permissions/auth/register'
  ) {
    hideLeftMenu();
    hideLogout();
    setLocaleCustomClassName('localeDropdownMenuNotLogged'); // NOTE: Temporary should be removed when we switch to administrators
    unsetAppSecured();
    history.push(redirectEndPoint);

    return cb();
  }

  if (pathname.includes(nonProtectedURLs)) {
    hideLeftMenu();
    hideLogout();
    setLocaleCustomClassName('localeDropdownMenuNotLogged'); // NOTE: Temporary should be removed when we switch to administrators
    unsetAppSecured();

    return cb();
  }

  resetLocaleDefaultClassName(); // NOTE: Temporary should be removed when we switch to administrators
  showLeftMenu();
  showLogout();
  setAppSecured();

  return cb();
}

export default willSecure;
