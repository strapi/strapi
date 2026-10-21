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

describe('Content Manager audit events', () => {
  test('registers the entry events', () => {
    expect(Object.keys(getTransformers())).toEqual(['entry.draft-discard']);
  });

  describe('entry.draft-discard', () => {
    test('records the entry and its locale, not its content', () => {
      expect(
        getTransformers()['entry.draft-discard']({
          model: 'article',
          uid: 'api::article.article',
          entry: { id: 4, documentId: 'abc123', locale: 'fr', title: 'Bonjour', password: 'x' },
        })
      ).toEqual({
        resource: { type: 'entry', uid: 'api::article.article', id: 'abc123' },
        details: { locale: 'fr' },
      });
    });

    test('records a null locale for a content type without i18n', () => {
      expect(
        getTransformers()['entry.draft-discard']({
          uid: 'api::article.article',
          entry: { documentId: 'abc123' },
        })
      ).toEqual({
        resource: { type: 'entry', uid: 'api::article.article', id: 'abc123' },
        details: { locale: null },
      });
    });
  });
});
