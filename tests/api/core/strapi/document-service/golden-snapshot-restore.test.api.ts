import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID } from './utils';

/**
 * Verifies golden snapshot teardown: two sequential suites using the full document-service
 * resource pack can share test-apps/api without legacy CTB cleanup between describes.
 */
describe('API test golden snapshot restore — suite A', () => {
  let testUtils: Awaited<ReturnType<typeof createTestSetup>>;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  it('loads article fixtures from the builder', async () => {
    const articles = await testUtils.strapi.documents(ARTICLE_UID).findMany();
    expect(articles.length).toBeGreaterThan(0);
  });
});

describe('API test golden snapshot restore — suite B', () => {
  let testUtils: Awaited<ReturnType<typeof createTestSetup>>;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  it('rebuilds the same schema after suite A golden restore', async () => {
    const articles = await testUtils.strapi.documents(ARTICLE_UID).findMany();
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].title).toBeDefined();
  });
});
