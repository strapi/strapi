import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils, describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';
import fs from 'fs';
import path from 'path';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const componentModel = {
  displayName: 'review',
  category: 'default',
  attributes: {
    feedback: {
      type: 'string',
    },
  },
};

const componentToNest = {
  displayName: 'first-level-compo',
  category: 'tests',
  attributes: {
    firstLevelCompoImage: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: false,
    },
    firstLevelCompoSiblingImage: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: false,
    },
  },
};

const componentWithImageModel = {
  displayName: 'root-compo',
  category: 'tests',
  attributes: {
    rootImage: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: false,
    },
    rootImageSibling: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: false,
    },
    firstLevelCompo: {
      type: 'component',
      repeatable: false,
      component: 'tests.first-level-compo',
    },
  },
};

const relationUid = 'api::tag.tag';
const relationModel = {
  draftAndPublish: true,
  singularName: 'tag',
  pluralName: 'tags',
  displayName: 'Tag',
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
    password: {
      type: 'password',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

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
    tags_one_to_one: {
      type: 'relation',
      relation: 'oneToOne',
      target: relationUid,
      targetAttribute: 'product',
    },
    tags_one_to_many: {
      type: 'relation',
      relation: 'oneToMany',
      target: relationUid,
      targetAttribute: 'tag_one_to_many',
    },
    image: {
      type: 'media',
      multiple: false,
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    images: {
      type: 'media',
      multiple: true,
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    password: {
      type: 'password',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    reviews: {
      type: 'component',
      repeatable: true,
      component: 'default.review',
    },
    nestedComposWithImages: {
      type: 'component',
      repeatable: false,
      component: 'tests.root-compo',
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
  let relations;

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
      qs: { locale: locale ?? 'en' },
    });

    return body;
  };

  const uploadFiles = async () => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: [
          fs.createReadStream(path.join(__dirname, 'rec.jpg')),
          fs.createReadStream(path.join(__dirname, 'strapi.jpg')),
        ],
      },
    });

    return res.body;
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
    builder.addComponent(componentModel);
    builder.addComponent(componentToNest);
    builder.addComponent(componentWithImageModel);
    builder.addContentTypes([relationModel, collectionTypeModel, singleTypeModel]);
    await builder.build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Create another locale
    const localeService = strapi.plugin('i18n').service('locales');
    await localeService.create({ code: 'fr', name: 'French' });

    // Create the relations to be added to versions
    relations = await Promise.all([
      createEntry({
        uid: relationUid,
        data: {
          name: 'Tag 1',
        },
      }),
      createEntry({
        uid: relationUid,
        data: {
          name: 'Tag 2',
        },
      }),
      createEntry({
        uid: relationUid,
        data: {
          name: 'Tag 3',
        },
      }),
    ]);
    const relationIds = relations.map((relation) => relation.data.documentId);

    // Upload media assets to be added to versions
    const [imageA, imageB] = await uploadFiles();
    const nestedComposWithImages = {
      rootImage: imageA.id,
      rootImageSibling: imageB.id,
      firstLevelCompo: {
        firstLevelCompoImage: imageA.id,
        firstLevelCompoSiblingImage: imageB.id,
      },
    };
    // Create a collection type to create an initial history version
    const collectionTypeEntry = await createEntry({
      uid: collectionTypeUid,
      data: {
        name: 'Product 1',
        tags_one_to_one: relationIds[0],
        tags_one_to_many: relationIds,
        image: imageA.id,
        images: [imageA.id, imageB.id],
        nestedComposWithImages,
      },
    });

    // Update the single type to create an initial history version
    const singleTypeEntry = await updateEntry({
      uid: singleTypeUid,
      data: {
        title: 'Welcome',
      },
      isCollectionType: false,
    });

    // Set the documentIds to test
    collectionTypeDocumentId = collectionTypeEntry.data.documentId;
    singleTypeDocumentId = singleTypeEntry.data.documentId;

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
    // Delete all locales that have been created
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Find many history versions', () => {
    test('Throws with invalid query params for a collection type', async () => {
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

    test('Throws with invalid query params for a single type', async () => {
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

    test('Finds many versions in the default locale for a collection type', async () => {
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

    test('Finds many versions in the provided locale for a collection type', async () => {
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

    test('Finds many versions in the default locale for a single type', async () => {
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

    test('Finds many versions in the provided locale for a single type', async () => {
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

    test('Finds many versions with pagination params', async () => {
      const collectionType = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&page=1&pageSize=1&locale=en`,
      });

      expect(collectionType.body.data).toHaveLength(1);
      expect(collectionType.body.meta.pagination).toEqual({
        page: 1,
        pageSize: 1,
        pageCount: 2,
        total: 2,
      });
    });

    test('Finds many versions with sensitive data', async () => {
      const collectionType = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&page=1&pageSize=1&locale=en`,
      });

      expect(collectionType.body.data).toHaveLength(1);
      expect(Object.keys(collectionType.body.data[0].data).includes('password')).toBe(false);
      expect(
        Object.keys(collectionType.body.data[0].data.tags_one_to_one.results[0]).includes(
          'password'
        )
      ).toBe(false);
    });

    test('Creates a history version when cloning an entry', async () => {
      // Find an entry and clone it
      const { documentId: currentDocumentId, ...currentDocumentData } = await strapi
        .documents(collectionTypeUid)
        .findFirst();
      const cloneRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${collectionTypeUid}/clone/${currentDocumentId}`,
        body: currentDocumentData,
      });

      // Get the history of the cloned entry
      const cloneHistoryVersions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions?contentType=${collectionTypeUid}&documentId=${cloneRes.body.data.documentId}&page=1`,
      });

      expect(cloneHistoryVersions.body.meta.pagination.total).toBe(1);
      expect(cloneHistoryVersions.body.data[0].relatedDocumentId).toBe(
        cloneRes.body.data.documentId
      );
    });
  });

  describe('Restore a history version', () => {
    test('Throws with invalid body', async () => {
      const versions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&page=1&pageSize=3&locale=en`,
      });
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/${versions.body.data.at(-1)}/restore`,
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
      const versions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&page=1&pageSize=3&locale=en`,
      });
      const restrictedRq = await createUserAndReq('read', [
        { action: 'plugin::content-manager.explorer.read', subject: collectionTypeUid },
      ]);
      const res = await restrictedRq({
        method: 'PUT',
        url: `/content-manager/history-versions/${versions.body.data.at(-1)}/restore`,
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
      const versions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}`,
      });

      const res = await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/${versions.body.data.at(-1).id}/restore`,
        body: {
          contentType: collectionTypeUid,
        },
      });
      const restoredDocument = await strapi
        .documents(collectionTypeUid)
        .findOne({ documentId: collectionTypeDocumentId });

      expect(res.statusCode).toBe(200);
      expect(restoredDocument.description).toBe(null);
    });

    test('Restores a history version in the provided locale', async () => {
      const versions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&locale=fr`,
      });
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/${versions.body.data.at(-1).id}/restore`,
        body: {
          contentType: collectionTypeUid,
        },
      });
      const restoredDocument = await strapi
        .documents(collectionTypeUid)
        .findOne({ documentId: collectionTypeDocumentId, locale: 'fr' });

      expect(res.statusCode).toBe(200);
      expect(restoredDocument.description).toBe(null);
    });

    test('Restores a history version with missing relations', async () => {
      // The initial version of the document had relations
      const versions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&locale=en`,
      });

      // Delete a relation
      await strapi.documents(relationUid).delete({ documentId: relations[0].data.documentId });

      // Restore the initial version containing the deleted relation
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/${versions.body.data.at(-1).id}/restore`,
        body: {
          contentType: collectionTypeUid,
        },
      });
      // Get the restored document
      const restoredDocument = await strapi.documents(collectionTypeUid).findOne({
        documentId: collectionTypeDocumentId,
        populate: ['tags_one_to_one', 'tags_one_to_many', 'image'],
      });

      // Assert the request was successful
      expect(res.statusCode).toBe(200);
      // Assert the restored document set the relation to null after they were deleted
      expect(restoredDocument['tags_one_to_one']).toBe(null);
      expect(restoredDocument['tags_one_to_many']).toHaveLength(2);
    });

    test('Restores a history version with missing media assets', async () => {
      // All versions of the document were created with media assets
      const versions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions?contentType=${collectionTypeUid}&documentId=${collectionTypeDocumentId}&page=1&pageSize=3&locale=en`,
      });

      // Delete an asset
      await rq({
        method: 'DELETE',
        url: `/upload/files/1`,
      });

      // Restore the initial version containing the deleted asset
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/${versions.body.data.at(-1).id}/restore`,
        body: {
          contentType: collectionTypeUid,
        },
      });

      // Assert the request was successful
      await expect(res.statusCode).toBe(200);

      // Get the restored document
      const restoredDocument = await strapi.documents(collectionTypeUid).findOne({
        documentId: collectionTypeDocumentId,
        populate: {
          image: true,
          images: true,
          nestedComposWithImages: {
            populate: {
              rootImage: true,
              rootImageSibling: true,
              firstLevelCompo: {
                populate: {
                  firstLevelCompoImage: true,
                  firstLevelCompoSiblingImage: true,
                },
              },
            },
          },
        },
      });

      // Assert the restored document handles the asset deletion in nested components
      expect(restoredDocument.nestedComposWithImages.rootImage).toBe(null);
      expect(restoredDocument.nestedComposWithImages.rootImageSibling).not.toBe(null);
      expect(restoredDocument.nestedComposWithImages.firstLevelCompo.firstLevelCompoImage).toBe(
        null
      );
      expect(
        restoredDocument.nestedComposWithImages.firstLevelCompo.firstLevelCompoSiblingImage
      ).not.toBe(null);
    });

    test('Restores a version with deleted components', async () => {
      // Create a document that contains components, then delete the components and make an update
      const currentDocument = await createEntry({
        uid: collectionTypeUid,
        data: { name: 'Product with reviews', reviews: [{ feedback: 'Great!' }] },
      });
      await updateEntry({
        uid: collectionTypeUid,
        documentId: currentDocument.data.documentId,
        data: { reviews: [] },
      });
      await updateEntry({
        uid: collectionTypeUid,
        documentId: currentDocument.data.documentId,
        data: { name: 'Product with no more reviews' },
      });

      // Find and restore the initial version that had the components data
      const versions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions?contentType=${collectionTypeUid}&documentId=${currentDocument.data.documentId}&page=1&pageSize=3&locale=en`,
      });
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/history-versions/${versions.body.data.at(2).id}/restore`,
        body: {
          contentType: collectionTypeUid,
        },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Bulk actions create versions', () => {
    it('Creates a history version when bulk publishing document entries', async () => {
      // Creating a new entry in multiple locales
      const enProduct = await createEntry({
        uid: collectionTypeUid,
        data: { name: 'Product - En' },
      });

      const frProduct = await updateEntry({
        uid: collectionTypeUid,
        documentId: enProduct.data.documentId,
        locale: 'fr',
        data: { name: 'Product - Fr' },
      });

      // Publishing both locales should result in 2 publish history versions (one for each locale)
      const bulkPublishResult = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${collectionTypeUid}/actions/bulkPublish`,
        qs: { locale: ['en', 'fr'] },
        body: { documentIds: [enProduct.data.documentId] },
      });

      expect(bulkPublishResult.statusCode).toBe(200);

      const enHistoryVersions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}&documentId=${enProduct.data.documentId}`,
      });

      const frHistoryVersions = await rq({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${collectionTypeUid}&documentId=${frProduct.data.documentId}&locale=fr`,
      });

      // Create + Publish = 2 versions
      expect(enHistoryVersions.body.data).toHaveLength(2);
      // First one should be the publish version and english locale
      expect(enHistoryVersions.body.data[0].status).toBe('published');
      expect(enHistoryVersions.body.data[0].locale.code).toBe('en');

      // Create + Publish = 2 versions
      expect(frHistoryVersions.body.data).toHaveLength(2);
      // First one should be the publish version and french locale
      expect(frHistoryVersions.body.data[0].status).toBe('published');
      expect(frHistoryVersions.body.data[0].locale.code).toBe('fr');
    });
  });
});
