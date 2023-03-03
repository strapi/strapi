'use strict';

const reviewWorkflowsMiddlewares = require('../review-workflows');

const strapiMock = {
  server: {
    router: {
      use: jest.fn(),
    },
  },
};
describe('Review workflows middlewares', () => {
  describe('contentTypeMiddleware', () => {
    test('Should add middleware to content-type-builder route', () => {
      const ctxMock = {
        method: 'PUT',
        request: {
          body: {
            contentType: {
              reviewWorkflows: true,
            },
          },
        },
      };
      const nextMock = () => {};
      strapiMock.server.router.use.mockImplementationOnce((route, callback) =>
        callback(ctxMock, nextMock)
      );
      reviewWorkflowsMiddlewares.contentTypeMiddleware(strapiMock);

      expect(strapiMock.server.router.use).toBeCalled();
      expect(strapiMock.server.router.use).toBeCalledWith(
        '/content-type-builder/content-types/:uid?',
        expect.any(Function)
      );
      expect(ctxMock.request.body.contentType.reviewWorkflows).toBeUndefined();
      expect(ctxMock.request.body.contentType.options?.reviewWorkflows).toBe(true);
    });
  });
});
