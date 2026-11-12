import type { Core } from '@strapi/types';

import { registerHistoryAuthors } from '../../authors';
import { createHistoryAuthorsService } from '../authors';

const mockAuthors = createHistoryAuthorsService();

jest.mock('../../utils', () => ({
  getService: () => mockAuthors,
}));

describe('history authors', () => {
  const strapi = {} as Core.Strapi;

  beforeAll(() => {
    registerHistoryAuthors(strapi);
  });

  it('finds a provider by its strategy', () => {
    expect(mockAuthors.findProviderByStrategy('admin-token')).toBeDefined();
    expect(mockAuthors.findProviderByStrategy('unknown')).toBeUndefined();
  });

  it('finds no name for a model with no provider', async () => {
    await expect(mockAuthors.findNames('plugin::gone.user', ['1'])).resolves.toEqual({});
  });
});
