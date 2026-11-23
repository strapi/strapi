import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import {
  STAGE_MODEL_UID,
  WORKFLOW_MODEL_UID,
  ENTITY_STAGE_ATTRIBUTE,
} from '../../../../packages/core/review-workflows/server/src/constants/workflows';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const builder = createTestBuilder();
let strapi;
let rq;

const articleUid = 'api::article.article';
const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: true,
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
  },
};

describeOnCondition(edition === 'EE')('Review workflows - Locales', () => {
  let defaultStage;
  let secondStage;
  let workflow;

  const getStage = async (documentId: string, locale: string) => {
    const entry = await strapi.db.query(articleUid).findOne({
      where: { documentId, locale, publishedAt: null },
      populate: [ENTITY_STAGE_ATTRIBUTE],
    });

    return entry?.[ENTITY_STAGE_ATTRIBUTE];
  };

  beforeAll(async () => {
    await builder.addContentTypes([articleModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });

    defaultStage = await strapi.db.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage' },
    });
    secondStage = await strapi.db.query(STAGE_MODEL_UID).create({
      data: { name: 'Stage 2' },
    });
    workflow = await strapi.db.query(WORKFLOW_MODEL_UID).create({
      data: {
        contentTypes: [articleUid],
        name: 'workflow',
        stages: [defaultStage.id, secondStage.id],
      },
    });
  });

  afterAll(async () => {
    await strapi.db.query(WORKFLOW_MODEL_UID).delete({ where: { id: workflow.id } });
    await strapi.db
      .query(STAGE_MODEL_UID)
      .deleteMany({ where: { id: { $in: [defaultStage.id, secondStage.id] } } });
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('A locale created through a Content Manager update gets the default stage', async () => {
    const { body: created } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${articleUid}`,
      body: { title: 'Article EN' },
    });
    const { documentId } = created.data;

    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${articleUid}/${documentId}`,
      body: { title: 'Article FR' },
      qs: { locale: 'fr' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.locale).toBe('fr');
    expect(await getStage(documentId, 'fr')).toMatchObject({ id: defaultStage.id });
  });

  test('A locale created through a document service update gets the default stage', async () => {
    const created = await strapi.documents(articleUid).create({
      data: { title: 'Article EN' },
    });

    await strapi.documents(articleUid).update({
      documentId: created.documentId,
      locale: 'fr',
      data: { title: 'Article FR' },
    });

    expect(await getStage(created.documentId, 'fr')).toMatchObject({ id: defaultStage.id });
  });

  test('An update of an existing locale keeps its stage', async () => {
    const created = await strapi.documents(articleUid).create({
      data: { title: 'Article EN', [ENTITY_STAGE_ATTRIBUTE]: secondStage.id },
    });

    await strapi.documents(articleUid).update({
      documentId: created.documentId,
      locale: 'en',
      data: { title: 'Article EN updated' },
    });

    expect(await getStage(created.documentId, 'en')).toMatchObject({ id: secondStage.id });
  });
});
