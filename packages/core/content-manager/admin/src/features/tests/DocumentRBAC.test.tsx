import { renderHook as renderRTLHook, waitFor } from '@tests/utils';
import { Routes, Route } from 'react-router-dom';

import { DocumentRBAC, DocumentRBACProps, useDocumentRBAC } from '../DocumentRBAC';

import type { Permission } from '@strapi/admin/strapi-admin';

const ALL_PERMISSIONS = [
  {
    id: 183,
    action: 'plugin::content-manager.explorer.delete',
    actionParameters: {},
    subject: 'api::address.address',
    properties: {},
    conditions: [],
  },
  {
    id: 194,
    action: 'plugin::content-manager.explorer.publish',
    actionParameters: {},
    subject: 'api::address.address',
    properties: {},
    conditions: [],
  },
  {
    id: 666,
    action: 'plugin::content-manager.explorer.create',
    actionParameters: {},
    subject: 'api::address.address',
    properties: {
      fields: [
        'short_text',
        'blocks',
        'single_compo.name',
        'single_compo.test',
        'dynamiczone',
        'custom_field',
      ],
    },
    conditions: [],
  },
  {
    id: 667,
    action: 'plugin::content-manager.explorer.read',
    actionParameters: {},
    subject: 'api::address.address',
    properties: {
      fields: [
        'short_text',
        'blocks',
        'single_compo.name',
        'single_compo.test',
        'dynamiczone',
        'custom_field',
      ],
    },
    conditions: [],
  },
  {
    id: 668,
    action: 'plugin::content-manager.explorer.update',
    actionParameters: {},
    subject: 'api::address.address',
    properties: {
      fields: [
        'short_text',
        'blocks',
        'single_compo.name',
        'single_compo.test',
        'dynamiczone',
        'custom_field',
      ],
    },
    conditions: [],
  },
] satisfies Permission[];

const makeRenderHook = (permissions: DocumentRBACProps['permissions']) => () =>
  renderRTLHook(() => useDocumentRBAC('TEST', (state) => state), {
    wrapper({ children }) {
      return (
        <Routes>
          <Route
            path="/content-manager/:collectionType/:slug"
            element={<DocumentRBAC permissions={permissions}>{children}</DocumentRBAC>}
          />
        </Routes>
      );
    },
    initialEntries: ['/content-manager/collection-type/api::address.address'],
  });

const ACTIONS = ['canCreate', 'canRead', 'canUpdate', 'canDelete', 'canPublish'] as const;

describe('DocumentRBAC', () => {
  describe('can CRUDP', () => {
    const renderHook = makeRenderHook(ALL_PERMISSIONS);

    ACTIONS.forEach((action) =>
      (action === 'canPublish' ? it.skip : it)(`should return true for ${action}`, async () => {
        const { result } = renderHook();

        await waitFor(() => expect(result.current.isLoading).toBeFalsy());

        expect(result.current[action]).toBeTruthy();
      })
    );

    it('should return the fields for create/read/update', async () => {
      const { result } = renderHook();

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.canCreateFields).toEqual([
        'postal_code',
        'categories',
        'cover',
        'images',
        'city',
        'json',
        'slug',
        'notrepeat_req.name',
        'repeat_req.name',
        'repeat_req_min.name',
      ]);

      expect(result.current.canReadFields).toEqual([
        'postal_code',
        'categories',
        'cover',
        'images',
        'city',
        'json',
        'slug',
        'notrepeat_req.name',
        'repeat_req.name',
        'repeat_req_min.name',
      ]);

      expect(result.current.canUpdateFields).toEqual([
        'postal_code',
        'categories',
        'cover',
        'images',
        'city',
        'json',
        'slug',
        'notrepeat_req.name',
        'repeat_req.name',
        'repeat_req_min.name',
      ]);
    });
  });

  // #26012: canReadFields must be the union of all roles' fields, not just the last role's.
  describe('Bug #1 — multi-role field union: two restricted roles', () => {
    const role1Read = {
      id: 900,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: 'api::article.article',
      properties: { fields: ['title', 'content'] },
      conditions: [],
    } satisfies Permission;

    const role2Read = {
      id: 901,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: 'api::article.article',
      properties: { fields: ['status', 'network'] },
      conditions: [],
    } satisfies Permission;

    const permissions = [role1Read, role2Read];

    it('unions canReadFields from all roles instead of keeping only the last one', async () => {
      const { result } = renderRTLHook(() => useDocumentRBAC('TEST', (state) => state), {
        wrapper({ children }) {
          return (
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug"
                element={<DocumentRBAC permissions={permissions}>{children}</DocumentRBAC>}
              />
            </Routes>
          );
        },
        initialEntries: ['/content-manager/collection-type/api::article.article'],
        providerOptions: { permissions },
      });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.canReadFields).toEqual(
        expect.arrayContaining(['title', 'content', 'status', 'network'])
      );
      expect(result.current.canReadFields).toHaveLength(4);
    });
  });

  // #26012: a role with unrestricted field access (fields: undefined) must not be
  // narrowed down to the restricted role's field list.
  describe('Bug #2 — unrestricted role fields (undefined) silenced by typeof check', () => {
    const permUnrestricted = {
      id: 902,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: 'api::article.article',
      properties: {},
      conditions: [],
    } satisfies Permission;

    const permRestricted = {
      id: 903,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: 'api::article.article',
      properties: { fields: ['title'] },
      conditions: [],
    } satisfies Permission;

    const permissions = [permUnrestricted, permRestricted];

    it('returns an empty field list when any role has unrestricted access', async () => {
      const { result } = renderRTLHook(() => useDocumentRBAC('TEST', (state) => state), {
        wrapper({ children }) {
          return (
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug"
                element={<DocumentRBAC permissions={permissions}>{children}</DocumentRBAC>}
              />
            </Routes>
          );
        },
        initialEntries: ['/content-manager/collection-type/api::article.article'],
        providerOptions: { permissions },
      });

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.canReadFields).toHaveLength(0);
    });
  });

  describe('can not do anything', () => {
    const renderHook = makeRenderHook([]);

    ACTIONS.forEach((action) =>
      it(`should return false for ${action}`, async () => {
        const { result } = renderHook();

        await waitFor(() => expect(result.current.isLoading).toBeFalsy());

        expect(result.current[action]).toBeFalsy();
      })
    );

    it('should return the fields for create/read/update', async () => {
      const { result } = renderHook();

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.canCreateFields).toEqual([]);

      expect(result.current.canReadFields).toEqual([]);

      expect(result.current.canUpdateFields).toEqual([]);
    });
  });
});
