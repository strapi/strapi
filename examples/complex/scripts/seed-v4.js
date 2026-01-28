#!/usr/bin/env node

const strapi = require('@strapi/strapi')();
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  counts: {
    basic: 5,
    basicDp: { published: 3, drafts: 2 },
    basicDpI18n: { published: 3, drafts: 2 },
    relation: 5,
    relationDp: { published: 5, drafts: 3 },
    relationDpI18n: { published: 5, drafts: 3 },
    mediaFiles: 10,
  },
  locales: ['en', 'fr'],
  invalidFkId: 987654321,
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
    const entries = [];

    for (let i = 0; i < CONFIG.counts.basic; i++) {
      try {
        const entry = await this.strapi.entityService.create('api::basic.basic', {
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
        entries.push(entry);
      } catch (error) {
        this.logError('basic', i + 1, error);
        throw error;
      }
    }

    this.results.basic = entries;
    return entries;
  }

  // Seed basic-dp content type
  async seedBasicDp() {
    console.log('Seeding basic-dp...');
    const published = [];
    const drafts = [];

    // Create published entries
    for (let i = 0; i < CONFIG.counts.basicDp.published; i++) {
      try {
        const mediaFile = this.pick(this.mediaFiles, i);
        const logo = mediaFile ? components.logo(mediaFile.id) : null;
        const header = logo ? components.header(logo) : null;

        const entry = await this.strapi.entityService.create('api::basic-dp.basic-dp', {
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
        published.push(entry);
      } catch (error) {
        this.logError('basic-dp published', i + 1, error);
        throw error;
      }
    }

    // Create draft entries
    for (let i = 0; i < CONFIG.counts.basicDp.drafts; i++) {
      try {
        const mediaFile = this.pick(this.mediaFiles, i + 3);
        const logo = mediaFile ? components.logo(mediaFile.id) : null;
        const header = logo ? components.header(logo) : null;

        const entry = await this.strapi.entityService.create('api::basic-dp.basic-dp', {
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
        drafts.push(entry);
      } catch (error) {
        this.logError('basic-dp draft', i + 1, error);
        throw error;
      }
    }

    this.results.basicDp = { published, drafts, all: [...published, ...drafts] };
    return this.results.basicDp;
  }

  // Update component relations after initial creation
  async updateComponentRelations() {
    console.log('Updating component relations...');
    const { basic, basicDp } = this.results;

    if (!basic?.length || !basicDp?.published?.length) return;

    // Update basic entries to reference basicDp
    for (let i = 0; i < basic.length; i++) {
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
    }

    // Update basicDp entries to cross-reference
    for (let i = 0; i < basicDp.published.length; i++) {
      const target = this.pick(basicDp.published, i + 1);
      await this.strapi.entityService.update('api::basic-dp.basic-dp', basicDp.published[i].id, {
        data: {
          textBlocks: [
            components.textBlock({ basicId: this.pick(basic, i)?.id, basicDpId: target?.id }),
            components.textBlock({ basicId: this.pick(basic, i + 1)?.id, basicDpId: target?.id }),
          ],
        },
      });
    }

    for (let i = 0; i < basicDp.drafts.length; i++) {
      const target = this.pick(basicDp.published, i);
      await this.strapi.entityService.update('api::basic-dp.basic-dp', basicDp.drafts[i].id, {
        data: {
          textBlocks: [
            components.textBlock({ basicId: this.pick(basic, i)?.id, basicDpId: target?.id }),
            components.textBlock({ basicId: this.pick(basic, i + 1)?.id, basicDpId: target?.id }),
          ],
        },
      });
    }
  }

  // Seed basic-dp-i18n content type
  async seedBasicDpI18n() {
    console.log('Seeding basic-dp-i18n...');
    const published = [];
    const drafts = [];

    for (const locale of CONFIG.locales) {
      // Published
      for (let i = 0; i < CONFIG.counts.basicDpI18n.published; i++) {
        try {
          const entry = await this.strapi.entityService.create('api::basic-dp-i18n.basic-dp-i18n', {
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
          published.push(entry);
        } catch (error) {
          this.logError(`basic-dp-i18n published (${locale})`, i + 1, error);
          throw error;
        }
      }

      // Drafts
      for (let i = 0; i < CONFIG.counts.basicDpI18n.drafts; i++) {
        try {
          const entry = await this.strapi.entityService.create('api::basic-dp-i18n.basic-dp-i18n', {
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
          drafts.push(entry);
        } catch (error) {
          this.logError(`basic-dp-i18n draft (${locale})`, i + 1, error);
          throw error;
        }
      }
    }

    this.results.basicDpI18n = { published, drafts, all: [...published, ...drafts] };
    return this.results.basicDpI18n;
  }

  // Seed relation content type
  async seedRelation() {
    console.log('Seeding relation...');
    const entries = [];
    const { basic, basicDp } = this.results;

    for (let i = 0; i < CONFIG.counts.relation; i++) {
      try {
        const relatedBasics = [this.pick(basic, i), this.pick(basic, i + 1)].filter(Boolean);
        const publishedDp = this.pick(basicDp?.published, i);
        const draftDp = this.pick(basicDp?.drafts, i);

        const entry = await this.strapi.entityService.create('api::relation.relation', {
          data: {
            name: `Relation ${random.string()}`,
            oneToOneBasic: relatedBasics[0]?.id || null,
            oneToManyBasics: relatedBasics.map((b) => b.id),
            manyToOneBasic: relatedBasics[0]?.id || null,
            manyToManyBasics: relatedBasics.map((b) => b.id),
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
        entries.push(entry);
      } catch (error) {
        this.logError('relation', i + 1, error);
        throw error;
      }
    }

    // Add self-references
    for (const entry of entries) {
      await this.strapi.entityService.update('api::relation.relation', entry.id, {
        data: {
          selfOne: entry.id,
          selfMany: [entry.id],
        },
      });
    }

    this.results.relation = entries;
    return entries;
  }

  // Seed relation-dp content type
  async seedRelationDp() {
    console.log('Seeding relation-dp...');
    const published = [];
    const drafts = [];
    const { basic, basicDp } = this.results;

    // Published
    for (let i = 0; i < CONFIG.counts.relationDp.published; i++) {
      try {
        const relatedDp = [this.pick(basicDp?.published, i), this.pick(basicDp?.drafts, i)].filter(
          Boolean
        );

        const relatedBasic = [this.pick(basic, i), this.pick(basic, i + 1)].filter(Boolean);

        const mediaFile = this.pick(this.mediaFiles, i);
        const logo = mediaFile ? components.logo(mediaFile.id) : null;
        const header = logo ? components.header(logo) : null;

        const entry = await this.strapi.entityService.create('api::relation-dp.relation-dp', {
          data: {
            name: `Relation DP Published ${i + 1}`,
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
        published.push(entry);
      } catch (error) {
        this.logError('relation-dp published', i + 1, error);
        throw error;
      }
    }

    // Drafts
    for (let i = 0; i < CONFIG.counts.relationDp.drafts; i++) {
      try {
        const relatedDp = [this.pick(basicDp?.drafts, i), this.pick(basicDp?.published, i)].filter(
          Boolean
        );

        const relatedBasic = [this.pick(basic, i), this.pick(basic, i + 1)].filter(Boolean);

        const mediaFile = this.pick(this.mediaFiles, i + 5);
        const logo = mediaFile ? components.logo(mediaFile.id) : null;
        const header = logo ? components.header(logo) : null;

        const entry = await this.strapi.entityService.create('api::relation-dp.relation-dp', {
          data: {
            name: `Relation DP Draft ${i + 1}`,
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
        drafts.push(entry);
      } catch (error) {
        this.logError('relation-dp draft', i + 1, error);
        throw error;
      }
    }

    // Add self-references
    for (const entry of [...published, ...drafts]) {
      await this.strapi.entityService.update('api::relation-dp.relation-dp', entry.id, {
        data: {
          selfOne: entry.id,
          selfMany: [entry.id],
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

      // Published
      for (let i = 0; i < CONFIG.counts.relationDpI18n.published; i++) {
        try {
          const related = [this.pick(localeBasics, i), this.pick(localeBasics, i + 1)].filter(
            Boolean
          );

          const entry = await this.strapi.entityService.create(
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
          published.push(entry);
        } catch (error) {
          this.logError(`relation-dp-i18n published (${locale})`, i + 1, error);
          throw error;
        }
      }

      // Drafts
      for (let i = 0; i < CONFIG.counts.relationDpI18n.drafts; i++) {
        try {
          const related = [this.pick(localeBasics, i), this.pick(localeBasics, i + 1)].filter(
            Boolean
          );

          const entry = await this.strapi.entityService.create(
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
          drafts.push(entry);
        } catch (error) {
          this.logError(`relation-dp-i18n draft (${locale})`, i + 1, error);
          throw error;
        }
      }
    }

    // Add self-references
    for (const entry of [...published, ...drafts]) {
      await this.strapi.entityService.update('api::relation-dp-i18n.relation-dp-i18n', entry.id, {
        data: {
          selfOne: entry.id,
          selfMany: [entry.id],
        },
        locale: entry.locale,
      });
    }

    this.results.relationDpI18n = { published, drafts, all: [...published, ...drafts] };
    return this.results.relationDpI18n;
  }

  // Run all seeders in sequence
  async seedAll() {
    await this.seedBasic();
    await this.seedBasicDp();
    await this.updateComponentRelations();
    await this.seedBasicDpI18n();
    await this.seedRelation();
    await this.seedRelationDp();
    await this.seedRelationDpI18n();
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
