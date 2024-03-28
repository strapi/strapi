import { RBAC, RBACMiddleware } from '../rbac';

describe('RBAC', () => {
  it('should let me add a single middleware', () => {
    const rbac = new RBAC();

    const middleware: RBACMiddleware = () => async (next, permissions) => {
      return next(permissions);
    };

    rbac.use([middleware]);
    expect(rbac['middlewares'].length).toBe(1);
  });

  it('should let me add multiple middlewares', () => {
    const rbac = new RBAC();

    const middleware: RBACMiddleware = () => (next, permissions) => {
      return next(permissions);
    };

    rbac.use([middleware, middleware, middleware]);

    expect(rbac['middlewares'].length).toBe(3);
  });

  it('should run the middlewares', async () => {
    const middleware = jest.fn((next, permissions) => next(permissions));

    const rbac = new RBAC();

    rbac.use([() => middleware, () => middleware, () => middleware]);

    const result = await rbac.run(
      {
        pathname: '',
        search: '',
        user: {
          id: '',
          email: '',
          firstname: '',
          lastname: '',
          roles: [],
        },
        permissions: [],
      },
      []
    );

    expect(result).toEqual([]);
    expect(middleware).toBeCalledTimes(3);
  });
});
