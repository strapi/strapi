'use strict';

const authRoutes = require('../content-api/auth');

const routes = authRoutes({ config: { get: jest.fn() } });
const findRoute = (method, path) =>
  routes.find((route) => route.method === method && route.path === path);

describe('Users & Permissions routes and the request abort signal', () => {
  // These GET routes write (confirm an email, create or sign in a user, issue a session). Only
  // reads of GET requests are aborted, so they opt out to not stop half way after a disconnect
  test.each([
    ['GET', '/auth/email-confirmation'],
    ['GET', '/auth/:provider/callback'],
    ['GET', '/connect/(.*)'],
  ])('%s %s opts out of the abort signal', (method, path) => {
    expect(findRoute(method, path).config.abortReadsOnRequestDisconnect).toBe(false);
  });

  test('read only GET routes do not opt out', () => {
    expect(findRoute('GET', '/auth/sessions').config.abortReadsOnRequestDisconnect).toBeUndefined();
  });

  test('POST and DELETE routes need no opt out, they are never armed', () => {
    routes
      .filter((route) => route.method !== 'GET')
      .forEach((route) => {
        expect(route.config.abortReadsOnRequestDisconnect).toBeUndefined();
      });
  });
});
