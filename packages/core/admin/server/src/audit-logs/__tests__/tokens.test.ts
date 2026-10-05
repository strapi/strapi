import { getTokenChanges, registerTokenAuditEvents, toAdminPermissionRefs } from '../tokens';

const getTransformers = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};

  registerTokenAuditEvents({
    registerEvent(name: string, transform: any) {
      transformers[name] = transform;
    },
  });

  return transformers;
};

describe('token audit events', () => {
  test('registers the four token events', () => {
    expect(Object.keys(getTransformers()).sort()).toEqual([
      'token.create',
      'token.delete',
      'token.regenerate',
      'token.update',
    ]);
  });

  test('token.create for a custom content-api token', () => {
    const transform = getTransformers()['token.create'];

    expect(
      transform({
        tokenId: 3,
        name: 'CI',
        kind: 'content-api',
        description: 'deploys',
        lifespan: '604800000',
        expiresAt: 1_800_000_000_000,
        type: 'custom',
        permissions: ['api::b.b.find', 'api::a.a.find'],
      })
    ).toEqual({
      resource: { type: 'content-api', id: 3, name: 'CI' },
      details: {
        description: 'deploys',
        lifespan: 604800000,
        expiresAt: new Date(1_800_000_000_000).toISOString(),
        type: 'custom',
        permissions: ['api::a.a.find', 'api::b.b.find'],
      },
    });
  });

  test('token.create for an admin token records the owner id and permission refs only', () => {
    const transform = getTransformers()['token.create'];

    const shape = transform({
      tokenId: 4,
      name: 'Bot',
      kind: 'admin',
      adminUserOwner: 7,
      description: null,
      lifespan: null,
      expiresAt: null,
      permissions: [{ action: 'admin::webhooks.read', subject: null, properties: {} }],
    });

    expect(shape).toEqual({
      resource: { type: 'admin', id: 4, name: 'Bot' },
      details: {
        description: null,
        lifespan: null,
        expiresAt: null,
        adminUserOwner: 7,
        permissions: [{ action: 'admin::webhooks.read', subject: null, properties: {} }],
      },
    });
    expect(JSON.stringify(shape)).not.toMatch(/email|accessKey|encryptedKey/);
  });

  test('token.update carries the changes', () => {
    const transform = getTransformers()['token.update'];
    const changes = { name: { before: 'a', after: 'b' } };

    expect(transform({ tokenId: 1, name: 'b', kind: 'transfer', changes })).toEqual({
      resource: { type: 'transfer', id: 1, name: 'b' },
      details: { changes },
    });
  });

  test('token.delete has no details unless the token has an owner', () => {
    const transform = getTransformers()['token.delete'];

    expect(transform({ tokenId: 1, name: 'x', kind: 'content-api' })).toEqual({
      resource: { type: 'content-api', id: 1, name: 'x' },
    });
    expect(transform({ tokenId: 2, name: 'y', kind: 'admin', adminUserOwner: 9 })).toEqual({
      resource: { type: 'admin', id: 2, name: 'y' },
      details: { adminUserOwner: 9 },
    });
  });

  test('token.regenerate has no details unless the token has an owner', () => {
    const transform = getTransformers()['token.regenerate'];

    expect(transform({ tokenId: 1, name: 'x', kind: 'transfer' })).toEqual({
      resource: { type: 'transfer', id: 1, name: 'x' },
    });
    expect(transform({ tokenId: 2, name: 'y', kind: 'admin', adminUserOwner: 9 })).toEqual({
      resource: { type: 'admin', id: 2, name: 'y' },
      details: { adminUserOwner: 9 },
    });
  });
});

describe('getTokenChanges', () => {
  test('returns an empty object when nothing changed, whatever the permission order', () => {
    expect(
      getTokenChanges(
        { name: 'a', description: '', type: 'custom', permissions: ['x', 'y'] },
        { name: 'a', description: '', type: 'custom', permissions: ['y', 'x'] }
      )
    ).toEqual({});
  });

  test('records changed scalar fields with before and after', () => {
    expect(
      getTokenChanges(
        { name: 'a', description: null, type: 'read-only' },
        { name: 'b', description: 'd', type: 'read-only' }
      )
    ).toEqual({
      name: { before: 'a', after: 'b' },
      description: { before: null, after: 'd' },
    });
  });

  test('records permission changes as sorted lists', () => {
    expect(
      getTokenChanges(
        { permissions: [{ action: 'b', subject: null, properties: {} }] },
        {
          permissions: [
            { action: 'c', subject: null, properties: {} },
            { action: 'a', subject: 'api::x.x', properties: { fields: ['title'] } },
          ],
        }
      )
    ).toEqual({
      permissions: {
        before: [{ action: 'b', subject: null, properties: {} }],
        after: [
          { action: 'a', subject: 'api::x.x', properties: { fields: ['title'] } },
          { action: 'c', subject: null, properties: {} },
        ],
      },
    });
  });
});

describe('toAdminPermissionRefs', () => {
  test('keeps action, subject and properties only', () => {
    expect(
      toAdminPermissionRefs([
        {
          id: 12,
          action: 'admin::webhooks.read',
          subject: undefined,
          properties: { fields: ['a'] },
          conditions: ['admin::is-creator'],
          actionParameters: {},
        } as any,
      ])
    ).toEqual([{ action: 'admin::webhooks.read', subject: null, properties: { fields: ['a'] } }]);
  });

  test('tolerates a missing relation', () => {
    expect(toAdminPermissionRefs(undefined)).toEqual([]);
  });
});
