import { Core } from '@strapi/types';
import { AbstractRoutesProvider } from '../../src/routes';

import { routes as fixtures } from '../fixtures';

export class RoutesProviderMock extends AbstractRoutesProvider {
  constructor(private readonly _routes: Core.Route[] = fixtures.test) {
    super(null);
  }

  get routes() {
    return this._routes;
  }
}
