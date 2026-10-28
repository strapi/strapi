import contentTypes from '..';

describe('Admin content types', () => {
  test('registers the audit-log content type in every edition', () => {
    expect(contentTypes).toHaveProperty('audit-log');
    expect(contentTypes['audit-log' as keyof typeof contentTypes].schema).toMatchObject({
      collectionName: 'strapi_audit_logs',
    });
  });
});
