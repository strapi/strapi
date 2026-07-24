import { routes } from '../fixtures';

export class StrapiMock {
  get config() {
    return {
      get: <T>(_key: string, defaultValue?: T): T => defaultValue as T,
    };
  }

  get apis() {
    return {
      'api-a': {
        routes: {
          'router-a': { routes: routes.test },
        },
      },
      'api-b': {
        routes: {
          'router-b': { routes: routes.foobar },
        },
      },
    };
  }

  /**
   * Plugins can expose routes either as a `Route[]` or as `Record<string, { routes: Route[] }>`
   */
  get plugins() {
    return {
      'plugin-a': {
        routes: routes.test,
      },
      'plugin-b': {
        routes: {
          'router-a': { routes: routes.foobar },
        },
      },
    };
  }
}
