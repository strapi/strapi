import { createTransferController } from '../../bootstrap/controllers';
import register from '../../register';

afterEach(() => {
  jest.clearAllMocks();
});

const strapiMock = {
  admin: {
    routes: {
      push: jest.fn(),
    },
  },
};

jest.mock('../../bootstrap/controllers', () => ({
  createTransferController: jest.fn(),
}));

describe('Register the Transfer route', () => {
  test('registers the /transfer route', () => {
    register(strapiMock);
    expect(strapiMock.admin.routes.push).toHaveBeenCalledWith({
      method: 'GET',
      path: '/transfer',
      handler: createTransferController(),
      config: {
        auth: false,
      },
    });
  });
});
