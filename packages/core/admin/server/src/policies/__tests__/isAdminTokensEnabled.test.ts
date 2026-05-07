import { errors } from '@strapi/utils';
import isAdminTokensEnabled from '../isAdminTokensEnabled';

describe('isAdminTokensEnabled policy', () => {
  test('throws NotFoundError when the future flag is disabled', () => {
    expect(() =>
      isAdminTokensEnabled.handler({} as any, {}, {
        strapi: {
          features: {
            future: {
              isEnabled: jest.fn(() => false),
            },
          },
        },
      } as any)
    ).toThrow(errors.NotFoundError);
  });

  test('allows the request when the future flag is enabled', () => {
    const response = isAdminTokensEnabled.handler({} as any, {}, {
      strapi: {
        features: {
          future: {
            isEnabled: jest.fn(() => true),
          },
        },
      },
    } as any);

    expect(response).toBeUndefined();
  });
});
