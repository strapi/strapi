import { getStrapiFactory } from '../../__tests__/test-utils';

import { createTransferHandler } from '../remote/handlers';
import register from '../register';

afterEach(() => {
  jest.clearAllMocks();
});

const strapiMockFactory = getStrapiFactory({
  admin: {
    routes: {
      push: jest.fn(),
    },
  },
});

jest.mock('../remote/handlers', () => ({
  createTransferHandler: jest.fn(),
}));

describe('Register the Transfer route', () => {
  test('registers the /transfer route', () => {
    const strapi = strapiMockFactory();

    register(strapi);
    expect(strapi.admin.routes.push).toHaveBeenCalledWith({
      method: 'GET',
      path: '/transfer',
      handler: createTransferHandler(),
      config: {
        auth: false,
      },
    });
  });
});
