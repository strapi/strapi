'use strict';

/* eslint-env jest */

const { buildRefreshCookieOptions } = require('../refresh-cookie-options');

describe('buildRefreshCookieOptions', () => {
  it('forwards maxAge when configured', () => {
    const options = buildRefreshCookieOptions(
      {
        cookie: {
          maxAge: 120000,
          secure: false,
        },
      },
      false
    );

    expect(options.maxAge).toBe(120000);
  });

  it('leaves maxAge undefined when not configured', () => {
    const options = buildRefreshCookieOptions(
      {
        cookie: {
          secure: false,
        },
      },
      false
    );

    expect(options.maxAge).toBeUndefined();
  });

  it('applies cookie defaults and secure fallback from environment', () => {
    expect(
      buildRefreshCookieOptions(
        {
          cookie: {},
        },
        true
      )
    ).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      overwrite: true,
    });

    expect(
      buildRefreshCookieOptions(
        {
          cookie: {},
        },
        false
      ).secure
    ).toBe(false);
  });

  it('respects explicit cookie attribute overrides', () => {
    const options = buildRefreshCookieOptions(
      {
        cookie: {
          secure: false,
          sameSite: 'strict',
          path: '/api',
          domain: 'example.com',
          maxAge: 60000,
        },
      },
      true
    );

    expect(options).toMatchObject({
      secure: false,
      sameSite: 'strict',
      path: '/api',
      domain: 'example.com',
      maxAge: 60000,
    });
  });
});
