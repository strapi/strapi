import type { Core } from '@strapi/types';
import createExtension from '../extension';

describe('GraphQL extension merging', () => {
  it('preserves resolver and policy precedence without mutating registered configurations', () => {
    const firstResolver = jest.fn();
    const secondResolver = jest.fn();
    const first = {
      resolvers: Object.freeze({ Query: Object.freeze({ article: firstResolver }) }),
      resolversConfig: Object.freeze({
        'Query.article': Object.freeze({ auth: false, policies: Object.freeze(['first']) }),
      }),
    };
    const second = {
      resolvers: Object.freeze({ Query: Object.freeze({ article: secondResolver }) }),
      resolversConfig: Object.freeze({
        'Query.article': Object.freeze({
          auth: true,
          policies: Object.freeze(['second', 'additional']),
          middlewares: Object.freeze(['middleware']),
        }),
      }),
    };
    const extension = createExtension({ strapi: {} as Core.Strapi })
      .use(first)
      .use(second);

    const result = extension.generate({ typeRegistry: {} });

    expect(result.resolvers).toEqual({ Query: { article: secondResolver } });
    expect(result.resolversConfig).toEqual({
      'Query.article': {
        auth: false,
        policies: ['first', 'additional'],
        middlewares: ['middleware'],
      },
    });
    expect(second.resolversConfig['Query.article'].auth).toBe(true);
    expect(second.resolversConfig['Query.article'].policies).toEqual(['second', 'additional']);
    expect(extension.generate({ typeRegistry: {} })).toEqual(result);
  });
});
