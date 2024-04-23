import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils, describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const collectionTypeUid = 'api::product.product';
const collectionTypeModel = {
  draftAndPublish: true,
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  kind: 'collectionType',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    description: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const singleTypeUid = 'api::homepage.homepage';
const singleTypeModel = {
  draftAndPublish: true,
  singularName: 'homepage',
  pluralName: 'homepages',
  displayName: 'Homepage',
  kind: 'singleType',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    subtitle: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

interface CreateEntryArgs {
  uid: string;
  data: Record<string, unknown>;
  isCollectionType?: boolean;
}

interface UpdateEntryArgs extends CreateEntryArgs {
  documentId?: string;
  locale?: string;
}

describeOnCondition(edition === 'EE')('History API', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let collectionTypeDocumentId;
  let singleTypeDocumentId;

  const createEntry = async ({ uid, data, isCollectionType = true }: CreateEntryArgs) => {
    const type = isCollectionType ? 'collection-types' : 'single-types';

    const { body } = await rq({
      method: 'POST',
      url: `/content-manager/${type}/${uid}`,
      body: data,
    });

    return body;
  };

  const updateEntry = async ({ uid, documentId, data, locale }: UpdateEntryArgs) => {
    const type = documentId ? 'collection-types' : 'single-types';
    const params = documentId ? `${type}/${uid}/${documentId}` : `${type}/${uid}`;

    const { body } = await rq({
      method: 'PUT',
      url: `/content-manager/${params}`,
      body: data,
      qs: { locale },
    });

    return body;
  };

  const createUserAndReq = async (
    userName: string,
    permissions: { action: string; subject: string }[]
  ) => {
    const utils = createUtils(strapi);
    const role = await utils.createRole({
      name: `role-${userName}`,
      description: `Role with restricted permissions for ${userName}`,
    });

    const rolePermissions = await utils.assignPermissionsToRole(role.id, permissions);
    Object.assign(role, { permissions: rolePermissions });

    const user = await utils.createUser({
      firstname: userName,
      lastname: 'User',
      email: `${userName}.user@strapi.io`,
      roles: [role.id],
    });

    const rq = await createAuthRequest({ strapi, userInfo: user });

    return rq;
  };

  beforeAll(async () => {
    await builder.addContentTypes([collectionTypeModel, singleTypeModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Create another locale
    const localeService = strapi.plugin('i18n').service('locales');
    await localeService.create({ code: 'fr', name: 'French' });

    // Create a collection type to create an initial history version
    const collectionType = await createEntry({
      uid: collectionTypeUid,
      data: {
        name: 'Product 1',
      },
    });

    // Update the single type to create an initial history version
    const singleType = await updateEntry({
      uid: singleTypeUid,
      data: {
        title: 'Welcome',
      },
      isCollectionType: false,
    });
    // Set the documentIds to test
    collectionTypeDocumentId = collectionType.data.documentId;
    singleTypeDocumentId = singleType.data.documentId;

    // Update to create history versions for entries in different locales
    await Promise.all([
      updateEntry({
        documentId: collectionTypeDocumentId,
        uid: collectionTypeUid,
        data: {
          description: 'Hello',
        },
      }),
      updateEntry({
        documentId: collectionTypeDocumentId,
        uid: collectionTypeUid,
        locale: 'fr',
        data: {
          name: 'Produit 1',
        },
      }),
      updateEntry({
        documentId: collectionTypeDocumentId,
        uid: collectionTypeUid,
        locale: 'fr',
        data: {
          description: 'Coucou',
        },
      }),
      updateEntry({
        uid: singleTypeUid,
        data: {
          description: 'Wow, amazing!',
        },
        isCollectionType: false,
      }),
      updateEntry({
        uid: singleTypeUid,
        data: {
          title: 'Bienvenue',
        },
        isCollectionType: false,
        locale: 'fr',
      }),
      updateEntry({
        uid: singleTypeUid,
        data: {
          description: 'Super',
        },
        isCollectionType: false,
        locale: 'fr',
      }),
    ]);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Find many history versions', () => {
    test('A collection type throws with invalid query params', async () => {
      const noDocumentId = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}`,
      });

      const noContentTypeUid = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?documentId=${collectionTypeDocumentId}`,
      });

      expect(noDocumentId.statusCode).toBe(403);
      expect(noContentTypeUid.statusCode).toBe(403);
    });

    test('A single type throws with invalid query params', async () => {
      const singleTypeNoContentTypeUid = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/`,
      });

      expect(singleTypeNoContentTypeUid.statusCode).toBe(403);
    });

    test('Throws without read permissions', async () => {
      const restrictedRq = await createUserAndReq('restricted', []);
      const res = await restrictedRq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}`,
      });

      expect(res.statusCode).toBe(403);
    });

    test('A collection type finds many versions in the default locale', async () => {
      const collectionType = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}`,
      });

      expect(collectionType.statusCode).toBe(200);
      expect(collectionType.body.data).toHaveLength(2);
      expect(collectionType.body.data[0].relatedDocumentId).toBe(collectionTypeDocumentId);
      expect(collectionType.body.data[1].relatedDocumentId).toBe(collectionTypeDocumentId);
      expect(collectionType.body.data[0].locale.code).toBe('en');
      expect(collectionType.body.data[1].locale.code).toBe('en');
      expect(collectionType.body.meta.pagination).toEqual({
        page: 1,
        pageSize: 20,
        pageCount: 1,
        total: 2,
      });
    });

    test('A collection type finds many versions in the provided locale', async () => {
      const collectionType = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&locale=fr`,
      });

      expect(collectionType.statusCode).toBe(200);
      expect(collectionType.body.data).toHaveLength(2);
      expect(collectionType.body.data[0].relatedDocumentId).toBe(collectionTypeDocumentId);
      expect(collectionType.body.data[1].relatedDocumentId).toBe(collectionTypeDocumentId);
      expect(collectionType.body.data[0].locale.code).toBe('fr');
      expect(collectionType.body.data[1].locale.code).toBe('fr');
      expect(collectionType.body.meta.pagination).toEqual({
        page: 1,
        pageSize: 20,
        pageCount: 1,
        total: 2,
      });
    });

    test('A single type finds many versions in the default locale', async () => {
      const singleType = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${singleTypeUid}`,
      });

      expect(singleType.statusCode).toBe(200);
      expect(singleType.body.data).toHaveLength(2);
      expect(singleType.body.data[0].relatedDocumentId).toBe(singleTypeDocumentId);
      expect(singleType.body.data[1].relatedDocumentId).toBe(singleTypeDocumentId);
      expect(singleType.body.data[0].locale.code).toBe('en');
      expect(singleType.body.data[1].locale.code).toBe('en');
      expect(singleType.body.meta.pagination).toEqual({
        page: 1,
        pageSize: 20,
        pageCount: 1,
        total: 2,
      });
    });

    test('A single type finds many versions in the provided locale', async () => {
      const singleType = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${singleTypeUid}&locale=fr`,
      });

      expect(singleType.statusCode).toBe(200);
      expect(singleType.body.data).toHaveLength(2);
      expect(singleType.body.data[0].relatedDocumentId).toBe(singleTypeDocumentId);
      expect(singleType.body.data[1].relatedDocumentId).toBe(singleTypeDocumentId);
      expect(singleType.body.data[0].locale.code).toBe('fr');
      expect(singleType.body.data[1].locale.code).toBe('fr');
      expect(singleType.body.meta.pagination).toEqual({
        page: 1,
        pageSize: 20,
        pageCount: 1,
        total: 2,
      });
    });

    test('Applies pagination params', async () => {
      const collectionType = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&page=1&pageSize=1`,
      });

      expect(collectionType.body.data).toHaveLength(1);
      expect(collectionType.body.meta.pagination).toEqual({
        page: 1,
        pageSize: 1,
        pageCount: 2,
        total: 2,
      });
    });
  });

  describe('Restore a history version', () => {
    test('Throws with invalid body', async () => {
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/1/restore`,
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'contentType is required',
        },
      });
    });

    test('Throws without update permissions', async () => {
      const restrictedRq = await createUserAndReq('read', [
        { action: 'plugin::content-manager.explorer.read', subject: collectionTypeUid },
      ]);
      const res = await restrictedRq({
        method: 'PUT',
        url: `/content-manager/history-versions/1/restore`,
        body: {
          contentType: collectionTypeUid,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 403,
          name: 'ForbiddenError',
          message: 'Forbidden',
        },
      });
    });

    test('Restores a history version in the default locale', async () => {
      const currentDocument = await strapi
        .documents(collectionTypeUid)
        .findOne({ documentId: collectionTypeDocumentId });

      await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/1/restore`,
        body: {
          contentType: collectionTypeUid,
        },
      });

      const restoredDocument = await strapi
        .documents(collectionTypeUid)
        .findOne({ documentId: collectionTypeDocumentId });

      expect(currentDocument.description).toBe('Hello');
      expect(restoredDocument.description).toBe(null);
    });

    test('Restores a history version in the provided locale', async () => {
      const currentDocument = await strapi
        .documents(collectionTypeUid)
        .findOne({ documentId: collectionTypeDocumentId, locale: 'fr' });

      await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/4/restore`,
        body: {
          contentType: collectionTypeUid,
        },
      });

      const restoredDocument = await strapi
        .documents(collectionTypeUid)
        .findOne({ documentId: collectionTypeDocumentId, locale: 'fr' });

      expect(currentDocument.description).toBe('Coucou');
      expect(restoredDocument.description).toBe(null);
    });
  });
});
