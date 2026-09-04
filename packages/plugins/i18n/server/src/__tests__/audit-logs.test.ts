import { registerAuditEvents } from '../audit-logs';

const getTransformers = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};

  registerAuditEvents({
    registerEvent(name: string, transform: any) {
      transformers[name] = transform;
    },
  });

  return transformers;
};

describe('i18n audit events', () => {
  test('registers the four locale events', () => {
    expect(Object.keys(getTransformers()).sort()).toEqual([
      'locale.create',
      'locale.default.update',
      'locale.delete',
      'locale.update',
    ]);
  });

  test('locale.create', () => {
    const transform = getTransformers()['locale.create'];

    expect(transform({ localeId: 2, name: 'French (France)', isDefault: false })).toEqual({
      resource: { type: 'locale', id: 2, name: 'French (France)' },
      details: { isDefault: false },
    });
  });

  test('locale.update', () => {
    const transform = getTransformers()['locale.update'];
    const changes = { name: { before: 'French (old)', after: 'French (France)' } };

    expect(transform({ localeId: 2, name: 'French (France)', changes })).toEqual({
      resource: { type: 'locale', id: 2, name: 'French (France)' },
      details: { changes },
    });
  });

  test('locale.delete carries no details', () => {
    const transform = getTransformers()['locale.delete'];

    expect(transform({ localeId: 2, name: 'French (France)' })).toEqual({
      resource: { type: 'locale', id: 2, name: 'French (France)' },
    });
  });

  test('locale.default.update points at the new default locale', () => {
    const transform = getTransformers()['locale.default.update'];
    const changes = {
      defaultLocale: { before: { id: 2, code: 'en' }, after: { id: 1, code: 'fr' } },
    };

    expect(transform({ localeId: 1, name: 'French (France)', changes })).toEqual({
      resource: { type: 'locale', id: 1, name: 'French (France)' },
      details: { changes },
    });
  });

  test('locale.default.update records no previous default on the first one', () => {
    const transform = getTransformers()['locale.default.update'];
    const changes = { defaultLocale: { before: null, after: { id: 1, code: 'en' } } };

    expect(transform({ localeId: 1, name: 'English (en)', changes })).toEqual({
      resource: { type: 'locale', id: 1, name: 'English (en)' },
      details: { changes },
    });
  });
});
