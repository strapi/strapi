#!/usr/bin/env node

const strapi = require('@strapi/strapi')();
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_COUNTS = {
  basic: 5,
  basicDp: { published: 3, drafts: 2 },
  basicDpI18n: { published: 3, drafts: 2 },
  relation: 5,
  relationDp: { published: 5, drafts: 3 },
  relationDpI18n: { published: 5, drafts: 3 },
  mediaFiles: 10,
  // Anti-pattern: high-cardinality M2M. At m=100 this produces ~2000 sources
  // × ~2000 targets, crossing the 1000-row chunk boundary in v4→v5 migrations
  // so cross-chunk code paths actually get exercised. Keep targets per source
  // modest (10) to avoid quadratic blow-up on disk.
  hcM2mSource: { published: 15, drafts: 5 },
  hcM2mTarget: { published: 15, drafts: 5 },
  hcM2mTargetsPerSource: 10,
};

function parseCliArgs(argv) {
  const opts = { multiplier: 1 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--multiplier' && argv[i + 1] != null) {
      opts.multiplier = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg?.startsWith('--multiplier=')) {
      opts.multiplier = Number(arg.split('=')[1]);
      continue;
    }

    if (!Number.isNaN(Number(arg))) {
      opts.multiplier = Number(arg);
    }
  }

  const envMultiplier = process.env.SEED_MULTIPLIER;
  if (!Number.isNaN(Number(envMultiplier))) {
    opts.multiplier = Number(envMultiplier);
  }

  if (!Number.isFinite(opts.multiplier) || opts.multiplier <= 0) {
    opts.multiplier = 1;
  }

  return opts;
}

function applyMultiplierToCounts(base, multiplier) {
  const m = Number(multiplier) || 1;
  return {
    basic: base.basic * m,
    basicDp: {
      published: base.basicDp.published * m,
      drafts: base.basicDp.drafts * m,
    },
    basicDpI18n: {
      published: base.basicDpI18n.published * m,
      drafts: base.basicDpI18n.drafts * m,
    },
    relation: base.relation * m,
    relationDp: {
      published: base.relationDp.published * m,
      drafts: base.relationDp.drafts * m,
    },
    relationDpI18n: {
      published: base.relationDpI18n.published * m,
      drafts: base.relationDpI18n.drafts * m,
    },
    mediaFiles: base.mediaFiles * m,
    hcM2mSource: {
      published: base.hcM2mSource.published * m,
      drafts: base.hcM2mSource.drafts * m,
    },
    hcM2mTarget: {
      published: base.hcM2mTarget.published * m,
      drafts: base.hcM2mTarget.drafts * m,
    },
    // Targets-per-source is intentionally NOT multiplied — it stays a constant
    // fan-out so the total join-row count scales with the source count only.
    hcM2mTargetsPerSource: base.hcM2mTargetsPerSource,
  };
}

const { multiplier } = parseCliArgs(process.argv.slice(2));

const CONFIG = {
  counts: applyMultiplierToCounts(BASE_COUNTS, multiplier),
  locales: ['en', 'fr'],
};

// ============================================================================
// DATA GENERATORS
// ============================================================================

const random = {
  string: (len = 8) =>
    Math.random()
      .toString(36)
      .substring(2, len + 2),
  number: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
  boolean: () => Math.random() > 0.5,
  date: () => new Date(2020 + Math.random() * 5, random.number(0, 11), random.number(1, 28)),
  pick: (arr) => arr[random.number(0, arr.length - 1)],
};

// ============================================================================
// CONCURRENCY HELPER
// ============================================================================

// Default concurrency for entity creation. Strapi v4's default knex pool is
// `{min: 2, max: 10}`, and relation-heavy entity creates (components + DZ +
// localizations) can use multiple connections per call. 5 keeps us well under
// the pool ceiling and still gives a meaningful speedup over strictly serial
// inserts. Tune up via SEED_CONCURRENCY=<n> env var if you've also raised the
// knex pool max in the v4 project's database config.
const SEED_CONCURRENCY = Number(process.env.SEED_CONCURRENCY) || 5;

/**
 * Run `taskFn(i)` for i=0..count-1 with at most `concurrency` tasks in flight.
 * Returns results in input order. Fails fast on the first task rejection.
 */
async function concurrentMap(count, concurrency, taskFn) {
  const results = new Array(count);
  let nextIndex = 0;
  let firstError = null;

  async function worker() {
    while (firstError == null) {
      const i = nextIndex;
      if (i >= count) return;
      nextIndex += 1;
      try {
        results[i] = await taskFn(i);
      } catch (err) {
        if (firstError == null) firstError = err;
        return;
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, count) }, worker);
  await Promise.all(workers);
  if (firstError) throw firstError;
  return results;
}

// ============================================================================
// FIELD FACTORIES
// ============================================================================

const fields = {
  basic: () => ({
    stringField: `String ${random.string()}`,
    textField: `Text ${random.string(20)}`,
    richText: `<p>Rich ${random.string(15)}</p>`,
    integerField: random.number(1, 1000),
    bigintegerField: random.number(1000000, 9999999),
    decimalField: parseFloat((Math.random() * 100).toFixed(2)),
    floatField: parseFloat((Math.random() * 100).toFixed(2)),
    booleanField: random.boolean(),
    dateField: random.date().toISOString().split('T')[0],
    datetimeField: random.date().toISOString(),
    timeField: `${String(random.number(0, 23)).padStart(2, '0')}:${String(random.number(0, 59)).padStart(2, '0')}:00`,
    emailField: `test${random.string()}@example.com`,
    passwordField: 'TestPassword123!',
    jsonField: { key: random.string(), value: random.number() },
    enumerationField: random.pick(['one', 'two', 'three']),
  }),
};

// ============================================================================
// COMPONENT FACTORIES
// ============================================================================

const components = {
  simpleInfo: () => ({
    title: `Info ${random.string()}`,
    description: `Description ${random.string(15)}`,
    count: random.number(1, 100),
    active: random.boolean(),
  }),

  imageBlock: () => ({
    alt: `Image ${random.string()}`,
    url: `https://example.com/images/${random.string()}.jpg`,
    caption: `Caption ${random.string()}`,
    width: random.number(100, 2000),
    height: random.number(100, 2000),
  }),

  textBlock: (relations = {}) => ({
    heading: `Heading ${random.string()}`,
    body: `<p>Body ${random.string(20)}</p>`,
    author: `Author ${random.string(4)}`,
    publishedDate: random.date().toISOString().split('T')[0],
    relatedBasic: relations.basicId || null,
    relatedBasicDp: relations.basicDpId || null,
    relatedRelationDp: relations.relationDpId || null,
  }),

  mediaBlock: () => ({
    title: `Media ${random.string()}`,
    mediaUrl: `https://example.com/media/${random.string()}.${random.pick(['jpg', 'mp4', 'mp3'])}`,
    mediaType: random.pick(['image', 'video', 'audio']),
    description: `Description ${random.string(15)}`,
  }),

  logo: (mediaId) => ({
    name: `Logo ${random.string()}`,
    logo: mediaId,
  }),

  header: (logoComponent) => ({
    title: `Header ${random.string()}`,
    headerlogo: logoComponent,
  }),

  reference: (articleId) => ({
    label: `Ref ${random.string()}`,
    article: articleId || null,
  }),

  referenceList: (references = []) => ({
    title: `RefList ${random.string()}`,
    references: Array.isArray(references) ? references : [references],
  }),

  // Dynamic zone wrappers
  forDynamicZone: (component, type) => ({
    __component: `shared.${type}`,
    ...component,
  }),
};

// ============================================================================
// MEDIA FILE CREATION
// ============================================================================

const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

async function createMediaFile(strapi, index) {
  const name = `testimage${index}.png`;
  const tempPath = path.join(os.tmpdir(), name);

  try {
    fs.writeFileSync(tempPath, PNG_BUFFER);

    const file = {
      filepath: tempPath,
      path: tempPath,
      originalFilename: name,
      name: name,
      size: PNG_BUFFER.length,
      mimetype: 'image/png',
      type: 'image/png',
    };

    const result = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        files: file,
        data: {
          fileInfo: {
            alternativeText: `Test ${name}`,
            caption: name,
            name: name.replace('.png', ''),
          },
        },
      });

    fs.unlinkSync(tempPath);
    return result[0];
  } catch (error) {
    console.error(`Failed to create media ${name}:`, error.message);
    try {
      fs.unlinkSync(tempPath);
    } catch {}
    return null;
  }
}

async function createMediaFiles(strapi, count) {
  console.log(`Creating ${count} media files...`);
  const files = [];
  for (let i = 0; i < count; i++) {
    const file = await createMediaFile(strapi, i + 1);
    if (file) files.push(file);
  }
  console.log(`Created ${files.length} media files`);
  return files;
}

// ============================================================================
// CONTENT TYPE SEEDERS
// ============================================================================

class ContentSeeder {
  constructor(strapi, mediaFiles = []) {
    this.strapi = strapi;
    this.mediaFiles = mediaFiles;
    this.results = {};
  }

  // Utility to pick items cyclically from arrays
  pick(array, index, fallback = null) {
    if (!array?.length) return fallback;
    return array[index % array.length] || fallback;
  }

  // Generic error logger
  logError(type, index, error) {
    console.error(`Failed to create ${type} entry ${index}:`, error.message);
    if (error.details?.errors) {
      error.details.errors.forEach((err) => {
        console.error(`  - ${err.path || 'unknown'}: ${err.message}`);
      });
    }
  }

  // Seed basic content type
  async seedBasic() {
    console.log('Seeding basic...');
    const entries = await concurrentMap(CONFIG.counts.basic, SEED_CONCURRENCY, async (i) => {
      try {
        return await this.strapi.entityService.create('api::basic.basic', {
          data: {
            ...fields.basic(),
            textBlocks: [components.textBlock(), components.textBlock()],
            mediaBlock: components.mediaBlock(),
            sections: [
              components.forDynamicZone(components.textBlock(), 'text-block'),
              components.forDynamicZone(components.mediaBlock(), 'media-block'),
            ],
          },
        });
      } catch (error) {
        this.logError('basic', i + 1, error);
        throw error;
      }
    });

    this.results.basic = entries;
    return entries;
  }

  // Seed basic-dp content type
  async seedBasicDp() {
    console.log('Seeding basic-dp...');

    const published = await concurrentMap(
      CONFIG.counts.basicDp.published,
      SEED_CONCURRENCY,
      async (i) => {
        try {
          const mediaFile = this.pick(this.mediaFiles, i);
          const logo = mediaFile ? components.logo(mediaFile.id) : null;
          const header = logo ? components.header(logo) : null;

          return await this.strapi.entityService.create('api::basic-dp.basic-dp', {
            data: {
              ...fields.basic(),
              textBlocks: [components.textBlock(), components.textBlock()],
              mediaBlock: components.mediaBlock(),
              header: header,
              sections: [
                components.forDynamicZone(components.textBlock(), 'text-block'),
                components.forDynamicZone(components.mediaBlock(), 'media-block'),
                ...(header ? [components.forDynamicZone(components.header(logo), 'header')] : []),
              ],
              publishedAt: new Date(),
            },
          });
        } catch (error) {
          this.logError('basic-dp published', i + 1, error);
          throw error;
        }
      }
    );

    const drafts = await concurrentMap(
      CONFIG.counts.basicDp.drafts,
      SEED_CONCURRENCY,
      async (i) => {
        try {
          const mediaFile = this.pick(this.mediaFiles, i + 3);
          const logo = mediaFile ? components.logo(mediaFile.id) : null;
          const header = logo ? components.header(logo) : null;

          return await this.strapi.entityService.create('api::basic-dp.basic-dp', {
            data: {
              ...fields.basic(),
              textBlocks: [components.textBlock(), components.textBlock()],
              mediaBlock: components.mediaBlock(),
              header: header,
              sections: [
                components.forDynamicZone(components.textBlock(), 'text-block'),
                components.forDynamicZone(components.mediaBlock(), 'media-block'),
                ...(header ? [components.forDynamicZone(components.header(logo), 'header')] : []),
              ],
            },
          });
        } catch (error) {
          this.logError('basic-dp draft', i + 1, error);
          throw error;
        }
      }
    );

    this.results.basicDp = { published, drafts, all: [...published, ...drafts] };
    return this.results.basicDp;
  }

  // Update component relations after initial creation
  async updateComponentRelations() {
    console.log('Updating component relations...');
    const { basic, basicDp } = this.results;

    if (!basic?.length || !basicDp?.published?.length) return;

    await concurrentMap(basic.length, SEED_CONCURRENCY, async (i) => {
      const publishedTarget = this.pick(basicDp.published, i);
      const draftTarget = this.pick(basicDp.drafts, i, publishedTarget);

      await this.strapi.entityService.update('api::basic.basic', basic[i].id, {
        data: {
          textBlocks: [
            components.textBlock({ basicDpId: publishedTarget?.id }),
            components.textBlock({ basicDpId: draftTarget?.id }),
          ],
          sections: [
            components.forDynamicZone(
              components.textBlock({ basicDpId: draftTarget?.id }),
              'text-block'
            ),
            components.forDynamicZone(components.mediaBlock(), 'media-block'),
          ],
        },
      });
    });

    await concurrentMap(basicDp.published.length, SEED_CONCURRENCY, async (i) => {
      const target = this.pick(basicDp.published, i + 1);
      await this.strapi.entityService.update('api::basic-dp.basic-dp', basicDp.published[i].id, {
        data: {
          textBlocks: [
            components.textBlock({ basicId: this.pick(basic, i)?.id, basicDpId: target?.id }),
            components.textBlock({ basicId: this.pick(basic, i + 1)?.id, basicDpId: target?.id }),
          ],
        },
      });
    });

    await concurrentMap(basicDp.drafts.length, SEED_CONCURRENCY, async (i) => {
      const target = this.pick(basicDp.published, i);
      await this.strapi.entityService.update('api::basic-dp.basic-dp', basicDp.drafts[i].id, {
        data: {
          textBlocks: [
            components.textBlock({ basicId: this.pick(basic, i)?.id, basicDpId: target?.id }),
            components.textBlock({ basicId: this.pick(basic, i + 1)?.id, basicDpId: target?.id }),
          ],
        },
      });
    });
  }

  // Seed basic-dp-i18n content type
  async seedBasicDpI18n() {
    console.log('Seeding basic-dp-i18n...');
    const published = [];
    const drafts = [];

    for (const locale of CONFIG.locales) {
      const pub = await concurrentMap(
        CONFIG.counts.basicDpI18n.published,
        SEED_CONCURRENCY,
        async (i) => {
          try {
            return await this.strapi.entityService.create('api::basic-dp-i18n.basic-dp-i18n', {
              data: {
                ...fields.basic(),
                textBlocks: [components.textBlock(), components.textBlock()],
                mediaBlock: components.mediaBlock(),
                sections: [
                  components.forDynamicZone(components.textBlock(), 'text-block'),
                  components.forDynamicZone(components.mediaBlock(), 'media-block'),
                ],
                publishedAt: new Date(),
              },
              locale,
            });
          } catch (error) {
            this.logError(`basic-dp-i18n published (${locale})`, i + 1, error);
            throw error;
          }
        }
      );
      published.push(...pub);

      const drf = await concurrentMap(
        CONFIG.counts.basicDpI18n.drafts,
        SEED_CONCURRENCY,
        async (i) => {
          try {
            return await this.strapi.entityService.create('api::basic-dp-i18n.basic-dp-i18n', {
              data: {
                ...fields.basic(),
                textBlocks: [components.textBlock(), components.textBlock()],
                mediaBlock: components.mediaBlock(),
                sections: [
                  components.forDynamicZone(components.textBlock(), 'text-block'),
                  components.forDynamicZone(components.mediaBlock(), 'media-block'),
                ],
              },
              locale,
            });
          } catch (error) {
            this.logError(`basic-dp-i18n draft (${locale})`, i + 1, error);
            throw error;
          }
        }
      );
      drafts.push(...drf);
    }

    this.results.basicDpI18n = { published, drafts, all: [...published, ...drafts] };
    return this.results.basicDpI18n;
  }

  // Seed relation content type
  async seedRelation() {
    console.log('Seeding relation...');
    const { basic, basicDp } = this.results;

    const entries = await concurrentMap(CONFIG.counts.relation, SEED_CONCURRENCY, async (i) => {
      try {
        const relatedBasics = [this.pick(basic, i), this.pick(basic, i + 1)].filter(Boolean);
        const publishedDp = this.pick(basicDp?.published, i);
        const draftDp = this.pick(basicDp?.drafts, i);

        return await this.strapi.entityService.create('api::relation.relation', {
          data: {
            name: `Relation ${random.string()}`,
            oneToOneBasic: relatedBasics[0]?.id || null,
            oneToManyBasics: relatedBasics.map((b) => b.id),
            manyToOneBasic: relatedBasics[0]?.id || null,
            manyToManyBasics: relatedBasics.map((b) => b.id),
            morph_to_one: relatedBasics[0]
              ? { __type: 'api::basic.basic', id: relatedBasics[0].id }
              : null,
            morph_to_many: relatedBasics.map((b) => ({ __type: 'api::basic.basic', id: b.id })),
            simpleInfo: components.simpleInfo(),
            content: [
              components.forDynamicZone(components.simpleInfo(), 'simple-info'),
              components.forDynamicZone(components.imageBlock(), 'image-block'),
            ],
            textBlocks: [
              components.textBlock({ basicId: relatedBasics[0]?.id, basicDpId: publishedDp?.id }),
              components.textBlock({ basicId: relatedBasics[1]?.id, basicDpId: draftDp?.id }),
            ],
            mediaBlock: components.mediaBlock(),
            sections: [
              components.forDynamicZone(
                components.textBlock({ basicDpId: draftDp?.id }),
                'text-block'
              ),
              components.forDynamicZone(components.mediaBlock(), 'media-block'),
            ],
          },
        });
      } catch (error) {
        this.logError('relation', i + 1, error);
        throw error;
      }
    });

    // Add self-references (parallelizable — each entry's update is independent).
    await concurrentMap(entries.length, SEED_CONCURRENCY, async (i) => {
      const entry = entries[i];
      await this.strapi.entityService.update('api::relation.relation', entry.id, {
        data: {
          selfOne: entry.id,
          selfMany: [entry.id],
        },
      });
    });

    this.results.relation = entries;
    return entries;
  }

  // Seed relation-dp content type
  async seedRelationDp() {
    console.log('Seeding relation-dp...');
    const { basic, basicDp, relation } = this.results;
    const morphTargetsFor = (indices) =>
      (relation || [])
        .filter((_, j) => indices.includes(j))
        .map((r) => ({ __type: 'api::relation.relation', id: r.id }));

    const published = await concurrentMap(
      CONFIG.counts.relationDp.published,
      SEED_CONCURRENCY,
      async (i) => {
        try {
          const relatedDp = [
            this.pick(basicDp?.published, i),
            this.pick(basicDp?.drafts, i),
          ].filter(Boolean);

          const relatedBasic = [this.pick(basic, i), this.pick(basic, i + 1)].filter(Boolean);

          const mediaFile = this.pick(this.mediaFiles, i);
          const logo = mediaFile ? components.logo(mediaFile.id) : null;
          const header = logo ? components.header(logo) : null;

          return await this.strapi.entityService.create('api::relation-dp.relation-dp', {
            data: {
              name: `Relation DP Published ${i + 1}`,
              cover: mediaFile?.id ?? null,
              morphTargets: morphTargetsFor([
                i % (relation?.length || 1),
                (i + 1) % (relation?.length || 1),
              ]),
              oneToOneBasic: relatedDp[0]?.id || null,
              oneToManyBasics: relatedDp.map((b) => b.id),
              manyToOneBasic: relatedDp[0]?.id || null,
              manyToManyBasics: relatedDp.map((b) => b.id),
              manyToOneBasicNoDp: relatedBasic[0]?.id || null,
              manyToManyBasicsNoDp: relatedBasic.map((b) => b.id),
              simpleInfo: components.simpleInfo(),
              content: [
                components.forDynamicZone(components.simpleInfo(), 'simple-info'),
                components.forDynamicZone(components.imageBlock(), 'image-block'),
              ],
              textBlocks: [
                components.textBlock({ basicDpId: relatedDp[0]?.id }),
                components.textBlock({ basicDpId: relatedDp[1]?.id }),
              ],
              mediaBlock: components.mediaBlock(),
              header: header,
              sections: [
                components.forDynamicZone(
                  components.textBlock({ basicDpId: relatedDp[1]?.id }),
                  'text-block'
                ),
                components.forDynamicZone(components.mediaBlock(), 'media-block'),
                ...(header ? [components.forDynamicZone(components.header(logo), 'header')] : []),
              ],
              publishedAt: new Date(),
            },
          });
        } catch (error) {
          this.logError('relation-dp published', i + 1, error);
          throw error;
        }
      }
    );

    const drafts = await concurrentMap(
      CONFIG.counts.relationDp.drafts,
      SEED_CONCURRENCY,
      async (i) => {
        try {
          const relatedDp = [
            this.pick(basicDp?.drafts, i),
            this.pick(basicDp?.published, i),
          ].filter(Boolean);

          const relatedBasic = [this.pick(basic, i), this.pick(basic, i + 1)].filter(Boolean);

          const mediaFile = this.pick(this.mediaFiles, i + 5);
          const logo = mediaFile ? components.logo(mediaFile.id) : null;
          const header = logo ? components.header(logo) : null;

          return await this.strapi.entityService.create('api::relation-dp.relation-dp', {
            data: {
              name: `Relation DP Draft ${i + 1}`,
              cover: mediaFile?.id ?? null,
              morphTargets: morphTargetsFor([
                i % (relation?.length || 1),
                (i + 2) % (relation?.length || 1),
              ]),
              oneToOneBasic: relatedDp[0]?.id || null,
              oneToManyBasics: relatedDp.map((b) => b.id),
              manyToOneBasic: relatedDp[0]?.id || null,
              manyToManyBasics: relatedDp.map((b) => b.id),
              manyToOneBasicNoDp: relatedBasic[0]?.id || null,
              manyToManyBasicsNoDp: relatedBasic.map((b) => b.id),
              simpleInfo: components.simpleInfo(),
              content: [
                components.forDynamicZone(components.simpleInfo(), 'simple-info'),
                components.forDynamicZone(components.imageBlock(), 'image-block'),
              ],
              textBlocks: [
                components.textBlock({ basicDpId: relatedDp[0]?.id }),
                components.textBlock({ basicDpId: relatedDp[1]?.id }),
              ],
              mediaBlock: components.mediaBlock(),
              header: header,
              sections: [
                components.forDynamicZone(
                  components.textBlock({ basicDpId: relatedDp[0]?.id }),
                  'text-block'
                ),
                components.forDynamicZone(components.mediaBlock(), 'media-block'),
                ...(header ? [components.forDynamicZone(components.header(logo), 'header')] : []),
              ],
            },
          });
        } catch (error) {
          this.logError('relation-dp draft', i + 1, error);
          throw error;
        }
      }
    );

    // Add self-references (each entry's update is independent, parallelizable).
    const allEntries = [...published, ...drafts];
    await concurrentMap(allEntries.length, SEED_CONCURRENCY, async (i) => {
      const entry = allEntries[i];
      await this.strapi.entityService.update('api::relation-dp.relation-dp', entry.id, {
        data: {
          selfOne: entry.id,
          selfMany: [entry.id],
        },
      });
    });

    // Add nested component with relations (reference-list -> references -> article) to first published entry for migration test
    if (published.length >= 2) {
      const relatedDpForFirst = [
        this.pick(basicDp?.published, 0),
        this.pick(basicDp?.drafts, 0),
      ].filter(Boolean);
      const mediaFileForFirst = this.pick(this.mediaFiles, 0);
      const logoForFirst = mediaFileForFirst ? components.logo(mediaFileForFirst.id) : null;
      const headerForFirst = logoForFirst ? components.header(logoForFirst) : null;
      const refListSection = components.forDynamicZone(
        components.referenceList([
          components.reference(published[1]?.id),
          components.reference(published[0]?.id),
        ]),
        'reference-list'
      );
      await this.strapi.entityService.update('api::relation-dp.relation-dp', published[0].id, {
        data: {
          sections: [
            components.forDynamicZone(
              components.textBlock({ basicDpId: relatedDpForFirst[0]?.id }),
              'text-block'
            ),
            components.forDynamicZone(components.mediaBlock(), 'media-block'),
            ...(headerForFirst
              ? [components.forDynamicZone(components.header(logoForFirst), 'header')]
              : []),
            refListSection,
          ],
        },
      });
    }

    this.results.relationDp = { published, drafts, all: [...published, ...drafts] };
    return this.results.relationDp;
  }

  // Seed relation-dp-i18n content type
  async seedRelationDpI18n() {
    console.log('Seeding relation-dp-i18n...');
    const published = [];
    const drafts = [];
    const { basicDpI18n } = this.results;

    for (const locale of CONFIG.locales) {
      const localeBasics = basicDpI18n?.all?.filter((b) => b.locale === locale) || [];

      const pub = await concurrentMap(
        CONFIG.counts.relationDpI18n.published,
        SEED_CONCURRENCY,
        async (i) => {
          try {
            const related = [this.pick(localeBasics, i), this.pick(localeBasics, i + 1)].filter(
              Boolean
            );
            return await this.strapi.entityService.create(
              'api::relation-dp-i18n.relation-dp-i18n',
              {
                data: {
                  name: `Relation DP i18n Published ${i + 1}`,
                  oneToOneBasic: related[0]?.id || null,
                  oneToManyBasics: related.map((b) => b.id),
                  manyToOneBasic: related[0]?.id || null,
                  manyToManyBasics: related.map((b) => b.id),
                  simpleInfo: components.simpleInfo(),
                  content: [
                    components.forDynamicZone(components.simpleInfo(), 'simple-info'),
                    components.forDynamicZone(components.imageBlock(), 'image-block'),
                  ],
                  textBlocks: [components.textBlock(), components.textBlock()],
                  mediaBlock: components.mediaBlock(),
                  sections: [
                    components.forDynamicZone(components.textBlock(), 'text-block'),
                    components.forDynamicZone(components.mediaBlock(), 'media-block'),
                  ],
                  publishedAt: new Date(),
                },
                locale,
              }
            );
          } catch (error) {
            this.logError(`relation-dp-i18n published (${locale})`, i + 1, error);
            throw error;
          }
        }
      );
      published.push(...pub);

      const drf = await concurrentMap(
        CONFIG.counts.relationDpI18n.drafts,
        SEED_CONCURRENCY,
        async (i) => {
          try {
            const related = [this.pick(localeBasics, i), this.pick(localeBasics, i + 1)].filter(
              Boolean
            );
            return await this.strapi.entityService.create(
              'api::relation-dp-i18n.relation-dp-i18n',
              {
                data: {
                  name: `Relation DP i18n Draft ${i + 1}`,
                  oneToOneBasic: related[0]?.id || null,
                  oneToManyBasics: related.map((b) => b.id),
                  manyToOneBasic: related[0]?.id || null,
                  manyToManyBasics: related.map((b) => b.id),
                  simpleInfo: components.simpleInfo(),
                  content: [
                    components.forDynamicZone(components.simpleInfo(), 'simple-info'),
                    components.forDynamicZone(components.imageBlock(), 'image-block'),
                  ],
                  textBlocks: [components.textBlock(), components.textBlock()],
                  mediaBlock: components.mediaBlock(),
                  sections: [
                    components.forDynamicZone(components.textBlock(), 'text-block'),
                    components.forDynamicZone(components.mediaBlock(), 'media-block'),
                  ],
                },
                locale,
              }
            );
          } catch (error) {
            this.logError(`relation-dp-i18n draft (${locale})`, i + 1, error);
            throw error;
          }
        }
      );
      drafts.push(...drf);
    }

    const allEntries = [...published, ...drafts];
    await concurrentMap(allEntries.length, SEED_CONCURRENCY, async (i) => {
      const entry = allEntries[i];
      await this.strapi.entityService.update('api::relation-dp-i18n.relation-dp-i18n', entry.id, {
        data: {
          selfOne: entry.id,
          selfMany: [entry.id],
        },
        locale: entry.locale,
      });
    });

    this.results.relationDpI18n = { published, drafts, all: [...published, ...drafts] };
    return this.results.relationDpI18n;
  }

  // Run all seeders in sequence
  // Seed the high-cardinality many-to-many pair. Anti-pattern by design:
  // N sources × K targets-per-source join-table rows exercise the v4→v5
  // `copyRelationTableRows` chunk-batched code path. With BASE=15/5 at m=100
  // we get ~2000 sources × 2000 targets × 10 joins-per-source = 20K join
  // rows, crossing the 1000-row chunk boundary multiple times.
  async seedHcM2m() {
    console.log('Seeding hc-m2m-target...');
    const targetsPub = await concurrentMap(
      CONFIG.counts.hcM2mTarget.published,
      SEED_CONCURRENCY,
      async (i) => {
        try {
          return await this.strapi.entityService.create('api::hc-m2m-target.hc-m2m-target', {
            data: {
              label: `Target ${random.string(6)}`,
              publishedAt: new Date(),
            },
          });
        } catch (error) {
          this.logError('hc-m2m-target published', i, error);
          return null;
        }
      }
    );
    const targetsDrf = await concurrentMap(
      CONFIG.counts.hcM2mTarget.drafts,
      SEED_CONCURRENCY,
      async (i) => {
        try {
          return await this.strapi.entityService.create('api::hc-m2m-target.hc-m2m-target', {
            data: {
              label: `Target draft ${random.string(6)}`,
              publishedAt: null,
            },
          });
        } catch (error) {
          this.logError('hc-m2m-target draft', i, error);
          return null;
        }
      }
    );
    const targets = {
      published: targetsPub.filter(Boolean),
      drafts: targetsDrf.filter(Boolean),
    };

    const allTargets = [...targets.published, ...targets.drafts];

    console.log('Seeding hc-m2m-source...');
    const fanout = CONFIG.counts.hcM2mTargetsPerSource;

    const pickTargetIds = (seedIdx) => {
      if (!allTargets.length) return [];
      const picks = [];
      for (let j = 0; j < fanout; j += 1) {
        picks.push(allTargets[(seedIdx + j) % allTargets.length].id);
      }
      // De-dup since modulo can repeat if fanout > allTargets.length.
      return [...new Set(picks)];
    };

    const sourcesPub = await concurrentMap(
      CONFIG.counts.hcM2mSource.published,
      SEED_CONCURRENCY,
      async (i) => {
        try {
          return await this.strapi.entityService.create('api::hc-m2m-source.hc-m2m-source', {
            data: {
              label: `Source ${random.string(6)}`,
              targets: pickTargetIds(i),
              publishedAt: new Date(),
            },
          });
        } catch (error) {
          this.logError('hc-m2m-source published', i, error);
          return null;
        }
      }
    );
    const sourcesDrf = await concurrentMap(
      CONFIG.counts.hcM2mSource.drafts,
      SEED_CONCURRENCY,
      async (i) => {
        try {
          return await this.strapi.entityService.create('api::hc-m2m-source.hc-m2m-source', {
            data: {
              label: `Source draft ${random.string(6)}`,
              targets: pickTargetIds(i + CONFIG.counts.hcM2mSource.published),
              publishedAt: null,
            },
          });
        } catch (error) {
          this.logError('hc-m2m-source draft', i, error);
          return null;
        }
      }
    );
    const sources = {
      published: sourcesPub.filter(Boolean),
      drafts: sourcesDrf.filter(Boolean),
    };

    this.results.hcM2mTarget = {
      published: targets.published,
      drafts: targets.drafts,
      all: allTargets,
    };
    this.results.hcM2mSource = {
      published: sources.published,
      drafts: sources.drafts,
      all: [...sources.published, ...sources.drafts],
    };
    return this.results.hcM2mSource;
  }

  async seedAll() {
    await this.seedBasic();
    await this.seedBasicDp();
    await this.updateComponentRelations();
    await this.seedBasicDpI18n();
    await this.seedRelation();
    await this.seedRelationDp();
    await this.seedRelationDpI18n();
    await this.seedHcM2m();
    return this.results;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function seed() {
  console.log('🌱 Starting simplified seed...\n');

  try {
    await strapi.load();

    // Create media files
    const mediaFiles = await createMediaFiles(strapi, CONFIG.counts.mediaFiles);

    // Run seeder
    const seeder = new ContentSeeder(strapi, mediaFiles);
    const results = await seeder.seedAll();

    // Display summary
    console.log('\n✅ Seed completed successfully!');
    console.log('\nCreated:');
    console.log(`  - ${results.basic?.length || 0} basic entries`);
    console.log(
      `  - ${results.basicDp?.all?.length || 0} basic-dp entries (${results.basicDp?.published?.length || 0} published, ${results.basicDp?.drafts?.length || 0} drafts)`
    );
    console.log(`  - ${results.basicDpI18n?.all?.length || 0} basic-dp-i18n entries`);
    console.log(`  - ${results.relation?.length || 0} relation entries`);
    console.log(`  - ${results.relationDp?.all?.length || 0} relation-dp entries`);
    console.log(`  - ${results.relationDpI18n?.all?.length || 0} relation-dp-i18n entries`);
    console.log(
      `  - ${results.hcM2mSource?.all?.length || 0} hc-m2m-source entries (${results.hcM2mSource?.published?.length || 0} published, ${results.hcM2mSource?.drafts?.length || 0} drafts)`
    );
    console.log(
      `  - ${results.hcM2mTarget?.all?.length || 0} hc-m2m-target entries (${results.hcM2mTarget?.published?.length || 0} published, ${results.hcM2mTarget?.drafts?.length || 0} drafts)`
    );
    console.log(`  - ${mediaFiles.length} media files`);
  } catch (error) {
    console.error('\n❌ Error seeding data:', error.message);
    if (error.details?.errors) {
      console.error('\nValidation errors:');
      error.details.errors.forEach((err, i) => {
        console.error(`  ${i + 1}. ${err.path || 'unknown'}: ${err.message}`);
      });
    }
    throw error;
  } finally {
    await strapi.destroy();
  }
}

// CLI execution
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seed;
