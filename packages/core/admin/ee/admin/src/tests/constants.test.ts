import { getEERoutes } from '../constants';

describe('getEERoutes', () => {
  const originalIsEE = window.strapi.isEE;
  const originalIsEnabled = window.strapi.features.isEnabled;

  beforeEach(() => {
    window.strapi.isEE = true;
  });

  afterEach(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  it('adds the SSO callback route with the sso feature', () => {
    window.strapi.features.isEnabled = (name) => name === 'sso';

    expect(getEERoutes().map((route) => route.path)).toEqual(['auth/login/:authResponse']);
  });

  it('omits the SSO callback route when the license lacks the sso feature', () => {
    window.strapi.features.isEnabled = () => false;

    expect(getEERoutes()).toEqual([]);
  });
});
