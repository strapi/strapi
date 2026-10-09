import reviewWorkflowsMiddlewares from '../review-workflows';

const strapiMock = {
  server: {
    router: {
      use: jest.fn(),
    },
  },
} as any;
describe('Review workflows middlewares', () => {
  describe('contentTypeMiddleware', () => {
    test.each(['PUT', 'POST'])('preserves the original options for a %s request', (method) => {
      const options = Object.freeze({ draftAndPublish: true, reviewWorkflows: false });
      const contentType = Object.freeze({ reviewWorkflows: true, options });
      const ctx = { method, request: { body: { contentType } } };
      const next = jest.fn();
      strapiMock.server.router.use.mockImplementationOnce(
        (route: string, callback: (ctx: unknown, next: () => void) => unknown) =>
          callback(ctx, next)
      );

      reviewWorkflowsMiddlewares.contentTypeMiddleware(strapiMock);

      expect(ctx.request.body.contentType).toEqual({
        options: { draftAndPublish: true, reviewWorkflows: true },
      });
      expect(ctx.request.body.contentType.options).not.toBe(options);
      expect(options.reviewWorkflows).toBe(false);
      expect(next).toHaveBeenCalledTimes(1);
    });

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
      strapiMock.server.router.use.mockImplementationOnce((route: any, callback: any) =>
        callback(ctxMock, nextMock)
      );
      reviewWorkflowsMiddlewares.contentTypeMiddleware(strapiMock);

      expect(strapiMock.server.router.use).toBeCalled();
      expect(strapiMock.server.router.use).toBeCalledWith(
        '/content-type-builder/content-types/:uid?',
        expect.any(Function)
      );
      expect(ctxMock.request.body.contentType.reviewWorkflows).toBeUndefined();
      // @ts-expect-error - options should be in contentType
      expect(ctxMock.request.body.contentType.options?.reviewWorkflows).toBe(true);
    });
  });
});
