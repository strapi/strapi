import { normalizeSettings } from '../useSettingsMenu';

describe('normalizeSettings', () => {
  it('returns a stable global section when settings are missing', () => {
    expect(normalizeSettings(undefined)).toEqual({
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [],
      },
    });
  });

  it('drops malformed settings sections and links, and defaults missing permissions', () => {
    expect(
      normalizeSettings({
        global: {
          id: 'global',
          intlLabel: {
            id: 'Settings.global',
            defaultMessage: 'Global Settings',
          },
          links: [
            undefined,
            {
              id: 'valid-link',
              to: 'valid-link',
              intlLabel: {
                id: 'valid-link',
                defaultMessage: 'Valid link',
              },
            },
            {
              id: 'missing-to',
              intlLabel: {
                id: 'missing-to',
                defaultMessage: 'Missing to',
              },
            },
          ],
        },
        broken: {
          links: [],
        },
      })
    ).toEqual({
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [
          {
            id: 'valid-link',
            to: 'valid-link',
            intlLabel: {
              id: 'valid-link',
              defaultMessage: 'Valid link',
            },
            permissions: [],
          },
        ],
      },
    });
  });
});
