import { House } from '@strapi/icons';

import { normalizeMenuLinks } from '../useMenu';

describe('normalizeMenuLinks', () => {
  it('returns an empty array when menu links are not an array', () => {
    expect(normalizeMenuLinks(undefined)).toEqual([]);
  });

  it('drops malformed menu links and defaults missing permissions', () => {
    expect(
      normalizeMenuLinks([
        undefined,
        {
          to: 'content-manager',
          icon: House,
          intlLabel: {
            id: 'content-manager.plugin.name',
            defaultMessage: 'Content Manager',
          },
        },
        {
          to: 'missing-icon',
          intlLabel: {
            id: 'missing-icon',
            defaultMessage: 'Missing icon',
          },
        },
      ])
    ).toEqual([
      {
        to: 'content-manager',
        icon: House,
        intlLabel: {
          id: 'content-manager.plugin.name',
          defaultMessage: 'Content Manager',
        },
        permissions: [],
      },
    ]);
  });
});
