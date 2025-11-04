#!/usr/bin/env node

/**
 * Seed script template for Strapi v4
 * This file will be copied to the v4 project and customized
 */

const strapi = require('@strapi/strapi')();

// Helper to generate random data
function randomString(length = 10) {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}

function randomNumber(min = 0, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBoolean() {
  return Math.random() > 0.5;
}

function randomDate() {
  const start = new Date(2020, 0, 1);
  const end = new Date();
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Create basic field values
function createBasicFields() {
  return {
    stringField: `String ${randomString(8)}`,
    textField: `Text field content: ${randomString(20)}`,
    richText: `<p>Rich text content: ${randomString(15)}</p>`,
    integerField: randomNumber(1, 1000),
    bigintegerField: randomNumber(1000000, 9999999),
    decimalField: parseFloat((Math.random() * 100).toFixed(2)),
    floatField: parseFloat((Math.random() * 100).toFixed(2)),
    booleanField: randomBoolean(),
    dateField: randomDate().toISOString().split('T')[0],
    datetimeField: randomDate().toISOString(),
    timeField: `${String(randomNumber(0, 23)).padStart(2, '0')}:${String(randomNumber(0, 59)).padStart(2, '0')}:00`,
    emailField: `test${randomString(6)}@example.com`,
    passwordField: 'TestPassword123!',
    jsonField: { key: randomString(), value: randomNumber() },
    enumerationField: ['one', 'two', 'three'][randomNumber(0, 2)],
  };
}

// Create component data
function createSimpleInfoComponent() {
  return {
    title: `Info Title ${randomString(6)}`,
    description: `Description: ${randomString(15)}`,
    count: randomNumber(1, 100),
    active: randomBoolean(),
  };
}

function createImageBlockComponent() {
  return {
    alt: `Image ${randomString(6)}`,
    url: `https://example.com/images/${randomString(8)}.jpg`,
    caption: `Caption: ${randomString(10)}`,
    width: randomNumber(100, 2000),
    height: randomNumber(100, 2000),
  };
}

// Create component data for dynamic zones (requires __component field)
function createSimpleInfoComponentForDynamicZone() {
  return {
    __component: 'shared.simple-info',
    ...createSimpleInfoComponent(),
  };
}

function createImageBlockComponentForDynamicZone() {
  return {
    __component: 'shared.image-block',
    ...createImageBlockComponent(),
  };
}

// Inject invalid enum values via direct database query (bypasses validation)
async function injectInvalidEnumValuesForTable(strapi, entries, tableName) {
  if (!entries || entries.length === 0) return;

  try {
    const db = strapi.db.connection;
    const client = db.client.config.client;

    // Get a few entry IDs to corrupt (leave at least one valid)
    const entriesToCorrupt = entries.slice(0, Math.min(2, entries.length - 1));
    const ids = entriesToCorrupt.map((e) => e.id);

    console.log(
      `  🔧 Injecting invalid enum values into ${ids.length} entries (table: ${tableName})...`
    );

    // Invalid enum value that doesn't match ["one", "two", "three"]
    const invalidValue = 'invalid_enum_value';

    if (client === 'sqlite' || client === 'better-sqlite3') {
      // SQLite
      await db(tableName).whereIn('id', ids).update({ enumeration_field: invalidValue });
    } else if (client === 'postgres' || client === 'pg') {
      // PostgreSQL
      await db(tableName).whereIn('id', ids).update({ enumeration_field: invalidValue });
    } else if (client === 'mysql' || client === 'mysql2') {
      // MySQL/MariaDB
      await db(tableName).whereIn('id', ids).update({ enumeration_field: invalidValue });
    } else {
      console.log(`  ⚠️  Unknown database client: ${client}, skipping invalid enum injection`);
      return;
    }

    console.log(
      `  ✅ Injected invalid enum value "${invalidValue}" into entries: ${ids.join(', ')}`
    );
  } catch (error) {
    console.error(`  ⚠️  Failed to inject invalid enum values: ${error.message}`);
    // Don't throw - this is optional for testing
  }
}

// Seed basic content types
async function seedBasic(strapi) {
  console.log('Seeding basic...');
  const entries = [];
  for (let i = 0; i < 5; i++) {
    try {
      const data = createBasicFields();
      const entry = await strapi.entityService.create('api::basic.basic', {
        data,
      });
      entries.push(entry);
    } catch (error) {
      console.error(`  ❌ Failed to create basic entry ${i + 1}:`, error.message);
      if (error.details && error.details.errors) {
        error.details.errors.forEach((err) => {
          console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
        });
      }
      throw error;
    }
  }

  // Inject invalid enum values via direct DB query (bypasses validation)
  await injectInvalidEnumValuesForTable(strapi, entries, 'basics');

  return entries;
}

async function seedBasicDp(strapi) {
  console.log('Seeding basic-dp...');
  const published = [];
  const drafts = [];

  // Create published entries
  for (let i = 0; i < 3; i++) {
    try {
      const entry = await strapi.entityService.create('api::basic-dp.basic-dp', {
        data: {
          ...createBasicFields(),
          publishedAt: new Date(),
        },
      });
      published.push(entry);
    } catch (error) {
      console.error(`  ❌ Failed to create basic-dp published entry ${i + 1}:`, error.message);
      if (error.details && error.details.errors) {
        error.details.errors.forEach((err) => {
          console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
        });
      }
      throw error;
    }
  }

  // Create draft entries
  for (let i = 0; i < 2; i++) {
    try {
      const entry = await strapi.entityService.create('api::basic-dp.basic-dp', {
        data: createBasicFields(),
        // No publishedAt = draft
      });
      drafts.push(entry);
    } catch (error) {
      console.error(`  ❌ Failed to create basic-dp draft entry ${i + 1}:`, error.message);
      if (error.details && error.details.errors) {
        error.details.errors.forEach((err) => {
          console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
        });
      }
      throw error;
    }
  }

  const allEntries = [...published, ...drafts];

  // Inject invalid enum values via direct DB query (bypasses validation)
  await injectInvalidEnumValuesForTable(strapi, allEntries, 'basic_dps');

  return { published, drafts, all: allEntries };
}

async function seedBasicDpI18n(strapi) {
  console.log('Seeding basic-dp-i18n...');
  const locales = ['en', 'fr']; // Default locales
  const entries = { published: [], drafts: [] };

  // Create entries in each locale
  for (const locale of locales) {
    // Published entries
    for (let i = 0; i < 3; i++) {
      try {
        const entry = await strapi.entityService.create('api::basic-dp-i18n.basic-dp-i18n', {
          data: {
            ...createBasicFields(),
            publishedAt: new Date(),
          },
          locale,
        });
        entries.published.push(entry);
      } catch (error) {
        console.error(
          `  ❌ Failed to create basic-dp-i18n published entry ${i + 1} (${locale}):`,
          error.message
        );
        if (error.details && error.details.errors) {
          error.details.errors.forEach((err) => {
            console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
          });
        }
        throw error;
      }
    }

    // Draft entries
    for (let i = 0; i < 2; i++) {
      try {
        const entry = await strapi.entityService.create('api::basic-dp-i18n.basic-dp-i18n', {
          data: createBasicFields(),
          locale,
        });
        entries.drafts.push(entry);
      } catch (error) {
        console.error(
          `  ❌ Failed to create basic-dp-i18n draft entry ${i + 1} (${locale}):`,
          error.message
        );
        if (error.details && error.details.errors) {
          error.details.errors.forEach((err) => {
            console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
          });
        }
        throw error;
      }
    }
  }

  entries.all = [...entries.published, ...entries.drafts];

  // Inject invalid enum values via direct DB query (bypasses validation)
  await injectInvalidEnumValuesForTable(strapi, entries.all, 'basic_dp_i18ns');

  return entries;
}

// Seed relation content types
async function seedRelation(strapi, basicEntries) {
  console.log('Seeding relation...');
  const entries = [];

  for (let i = 0; i < 5; i++) {
    try {
      const relatedBasics = basicEntries.slice(0, randomNumber(1, 3));
      const data = {
        name: `Relation ${randomString(6)}`,
        oneToOneBasic: relatedBasics[0]?.id || null,
        oneToManyBasics: relatedBasics.map((b) => b.id),
        manyToOneBasic: relatedBasics[0]?.id || null,
        manyToManyBasics: relatedBasics.map((b) => b.id),
        // Omit polymorphic relations (morphToOne, morphOne, morphMany) - they cause issues when null
        simpleInfo: createSimpleInfoComponent(),
        content: [
          createSimpleInfoComponentForDynamicZone(),
          createImageBlockComponentForDynamicZone(),
        ],
      };
      const entry = await strapi.entityService.create('api::relation.relation', {
        data,
      });
      entries.push(entry);
    } catch (error) {
      console.error(`  ❌ Failed to create relation entry ${i + 1}:`, error.message);
      if (error.details && error.details.errors) {
        error.details.errors.forEach((err) => {
          console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
        });
      }
      throw error;
    }
  }

  // Add self-referential relations (each entry references itself)
  for (const entry of entries) {
    await strapi.entityService.update('api::relation.relation', entry.id, {
      data: {
        selfOne: entry.id, // Reference itself
        selfMany: [entry.id], // Include itself in the array
      },
    });
  }

  return entries;
}

async function seedRelationDp(strapi, basicDpEntries) {
  console.log('Seeding relation-dp...');
  const published = [];
  const drafts = [];

  const allBasics = basicDpEntries.all || [];
  const publishedBasics = basicDpEntries.published || [];
  const draftBasics = basicDpEntries.drafts || [];

  // Create published entries - relate to BOTH published and draft basics
  for (let i = 0; i < 5; i++) {
    try {
      // Mix of published and draft basics
      const publishedRelated = publishedBasics.slice(0, randomNumber(0, 2));
      const draftRelated = draftBasics.slice(0, randomNumber(0, 2));
      const relatedBasics = [...publishedRelated, ...draftRelated];

      const entry = await strapi.entityService.create('api::relation-dp.relation-dp', {
        data: {
          name: `Relation DP Published ${i + 1} ${randomString(4)}`,
          oneToOneBasic: relatedBasics[0]?.id || null,
          oneToManyBasics: relatedBasics.map((b) => b.id),
          manyToOneBasic: relatedBasics[0]?.id || null,
          manyToManyBasics: relatedBasics.map((b) => b.id),
          // Omit polymorphic relations (morphToOne, morphOne, morphMany) - they cause issues when null
          simpleInfo: createSimpleInfoComponent(),
          content: [
            createSimpleInfoComponentForDynamicZone(),
            createImageBlockComponentForDynamicZone(),
          ],
          publishedAt: new Date(),
        },
      });
      published.push(entry);
    } catch (error) {
      console.error(`  ❌ Failed to create relation-dp published entry ${i + 1}:`, error.message);
      if (error.details && error.details.errors) {
        error.details.errors.forEach((err) => {
          console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
        });
      }
      throw error;
    }
  }

  // Create draft entries - also relate to both published and draft basics
  for (let i = 0; i < 3; i++) {
    try {
      // Mix of published and draft basics
      const publishedRelated = publishedBasics.slice(0, randomNumber(0, 2));
      const draftRelated = draftBasics.slice(0, randomNumber(0, 2));
      const relatedBasics = [...publishedRelated, ...draftRelated];

      const entry = await strapi.entityService.create('api::relation-dp.relation-dp', {
        data: {
          name: `Relation DP Draft ${i + 1} ${randomString(4)}`,
          oneToOneBasic: relatedBasics[0]?.id || null,
          oneToManyBasics: relatedBasics.map((b) => b.id),
          manyToOneBasic: relatedBasics[0]?.id || null,
          manyToManyBasics: relatedBasics.map((b) => b.id),
          // Omit polymorphic relations (morphToOne, morphOne, morphMany) - they cause issues when null
          simpleInfo: createSimpleInfoComponent(),
          content: [
            createSimpleInfoComponentForDynamicZone(),
            createImageBlockComponentForDynamicZone(),
          ],
          // No publishedAt = draft
        },
      });
      drafts.push(entry);
    } catch (error) {
      console.error(`  ❌ Failed to create relation-dp draft entry ${i + 1}:`, error.message);
      if (error.details && error.details.errors) {
        error.details.errors.forEach((err) => {
          console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
        });
      }
      throw error;
    }
  }

  // Add self-referential relations (each entry references itself)
  for (const entry of [...published, ...drafts]) {
    await strapi.entityService.update('api::relation-dp.relation-dp', entry.id, {
      data: {
        selfOne: entry.id, // Reference itself
        selfMany: [entry.id], // Include itself in the array
      },
    });
  }

  return { published, drafts, all: [...published, ...drafts] };
}

async function seedRelationDpI18n(strapi, basicDpI18nEntries) {
  console.log('Seeding relation-dp-i18n...');
  const locales = ['en', 'fr'];
  const entries = { published: [], drafts: [] };

  const allBasics = basicDpI18nEntries.all || [];
  const publishedBasics = basicDpI18nEntries.published || [];
  const draftBasics = basicDpI18nEntries.drafts || [];

  // Create entries in each locale
  for (const locale of locales) {
    // Published entries - relate to BOTH published and draft basics to test all scenarios
    for (let i = 0; i < 5; i++) {
      try {
        // Mix of published and draft basics
        const publishedRelated = publishedBasics.slice(0, randomNumber(0, 2));
        const draftRelated = draftBasics.slice(0, randomNumber(0, 2));
        const relatedBasics = [...publishedRelated, ...draftRelated];

        const entry = await strapi.entityService.create('api::relation-dp-i18n.relation-dp-i18n', {
          data: {
            name: `Relation DP i18n Published ${i + 1} ${randomString(4)}`,
            oneToOneBasic: relatedBasics[0]?.id || null,
            oneToManyBasics: relatedBasics.map((b) => b.id),
            manyToOneBasic: relatedBasics[0]?.id || null,
            manyToManyBasics: relatedBasics.map((b) => b.id),
            // Omit polymorphic relations (morphToOne, morphOne, morphMany) - they cause issues when null
            simpleInfo: createSimpleInfoComponent(),
            content: [
              createSimpleInfoComponentForDynamicZone(),
              createImageBlockComponentForDynamicZone(),
            ],
            publishedAt: new Date(),
          },
          locale,
        });
        entries.published.push(entry);
      } catch (error) {
        console.error(
          `  ❌ Failed to create relation-dp-i18n published entry ${i + 1} (${locale}):`,
          error.message
        );
        if (error.details && error.details.errors) {
          error.details.errors.forEach((err) => {
            console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
          });
        }
        throw error;
      }
    }

    // Draft entries - also relate to both published and draft basics
    for (let i = 0; i < 3; i++) {
      try {
        // Mix of published and draft basics
        const publishedRelated = publishedBasics.slice(0, randomNumber(0, 2));
        const draftRelated = draftBasics.slice(0, randomNumber(0, 2));
        const relatedBasics = [...publishedRelated, ...draftRelated];

        const entry = await strapi.entityService.create('api::relation-dp-i18n.relation-dp-i18n', {
          data: {
            name: `Relation DP i18n Draft ${i + 1} ${randomString(4)}`,
            oneToOneBasic: relatedBasics[0]?.id || null,
            oneToManyBasics: relatedBasics.map((b) => b.id),
            manyToOneBasic: relatedBasics[0]?.id || null,
            manyToManyBasics: relatedBasics.map((b) => b.id),
            // Omit polymorphic relations (morphToOne, morphOne, morphMany) - they cause issues when null
            simpleInfo: createSimpleInfoComponent(),
            content: [
              createSimpleInfoComponentForDynamicZone(),
              createImageBlockComponentForDynamicZone(),
            ],
            // No publishedAt = draft
          },
          locale,
        });
        entries.drafts.push(entry);
      } catch (error) {
        console.error(
          `  ❌ Failed to create relation-dp-i18n draft entry ${i + 1} (${locale}):`,
          error.message
        );
        if (error.details && error.details.errors) {
          error.details.errors.forEach((err) => {
            console.error(`     - ${err.path || 'unknown'}: ${err.message}`);
          });
        }
        throw error;
      }
    }
  }

  // Add self-referential relations (each entry references itself)
  const allEntries = [...entries.published, ...entries.drafts];
  for (const entry of allEntries) {
    await strapi.entityService.update('api::relation-dp-i18n.relation-dp-i18n', entry.id, {
      data: {
        selfOne: entry.id, // Reference itself
        selfMany: [entry.id], // Include itself in the array
      },
      locale: entry.locale,
    });
  }

  entries.all = allEntries;
  return entries;
}

async function seedSingleRun(strapi) {
  // Seed basic types first (they're referenced by relation types)
  const basicEntries = await seedBasic(strapi);
  const basicDpEntries = await seedBasicDp(strapi);
  const basicDpI18nEntries = await seedBasicDpI18n(strapi);

  // Seed relation types
  // Note: relation-dp relates to basic-dp, relation-dp-i18n relates to basic-dp-i18n
  const relationEntries = await seedRelation(strapi, basicEntries);
  const relationDpEntries = await seedRelationDp(strapi, basicDpEntries);
  const relationDpI18nEntries = await seedRelationDpI18n(strapi, basicDpI18nEntries);

  return {
    basicEntries,
    basicDpEntries,
    basicDpI18nEntries,
    relationEntries,
    relationDpEntries,
    relationDpI18nEntries,
  };
}

async function seed(multiplier = 1) {
  const multiplierNum = parseInt(multiplier, 10) || 1;

  console.log(`🌱 Starting seed (multiplier: ${multiplierNum})...\n`);

  try {
    await strapi.load();
  } catch (error) {
    // Migration errors can occur if the database already has migrations applied
    // but Strapi is trying to recreate indexes/constraints
    if (error.message && (error.message.includes('already exists') || error.code === '42P07')) {
      console.error('\n❌ Migration error: Database already has migrations applied.');
      console.error(
        '   The seed script expects a clean database or one that has been properly migrated.'
      );
      console.error('\n   Try one of these solutions:');
      console.error('   1. Wipe the database first (from v5 project): yarn db:wipe:postgres');
      console.error('   2. Or ensure the database is in a clean state before seeding\n');
      console.error(`   Error details: ${error.message}`);
      process.exit(1);
    } else {
      // Re-throw if it's a different error
      throw error;
    }
  }

  try {
    let totalStats = {
      basic: 0,
      basicDp: { published: 0, drafts: 0, total: 0 },
      basicDpI18n: { published: 0, drafts: 0, total: 0 },
      relation: 0,
      relationDp: { published: 0, drafts: 0, total: 0 },
      relationDpI18n: { published: 0, drafts: 0, total: 0 },
    };

    for (let run = 1; run <= multiplierNum; run++) {
      if (multiplierNum > 1) {
        console.log(`\n--- Run ${run} of ${multiplierNum} ---`);
      }

      const stats = await seedSingleRun(strapi);

      totalStats.basic += stats.basicEntries.length;
      totalStats.basicDp.published += stats.basicDpEntries.published.length;
      totalStats.basicDp.drafts += stats.basicDpEntries.drafts.length;
      totalStats.basicDp.total += stats.basicDpEntries.all.length;
      totalStats.basicDpI18n.published += stats.basicDpI18nEntries.published.length;
      totalStats.basicDpI18n.drafts += stats.basicDpI18nEntries.drafts.length;
      totalStats.basicDpI18n.total += stats.basicDpI18nEntries.all.length;
      totalStats.relation += stats.relationEntries.length;
      totalStats.relationDp.published += stats.relationDpEntries.published.length;
      totalStats.relationDp.drafts += stats.relationDpEntries.drafts.length;
      totalStats.relationDp.total += stats.relationDpEntries.all.length;
      totalStats.relationDpI18n.published += stats.relationDpI18nEntries.published.length;
      totalStats.relationDpI18n.drafts += stats.relationDpI18nEntries.drafts.length;
      totalStats.relationDpI18n.total += stats.relationDpI18nEntries.all.length;
    }

    console.log('\n✅ Seed completed successfully!');
    console.log(`\nTotal created (${multiplierNum} run${multiplierNum > 1 ? 's' : ''}):`);
    console.log(`  - ${totalStats.basic} basic entries`);
    console.log(
      `  - ${totalStats.basicDp.total} basic-dp entries (${totalStats.basicDp.published} published, ${totalStats.basicDp.drafts} drafts)`
    );
    console.log(
      `  - ${totalStats.basicDpI18n.total} basic-dp-i18n entries (${totalStats.basicDpI18n.published} published, ${totalStats.basicDpI18n.drafts} drafts)`
    );
    console.log(`  - ${totalStats.relation} relation entries`);
    console.log(
      `  - ${totalStats.relationDp.total} relation-dp entries (${totalStats.relationDp.published} published, ${totalStats.relationDp.drafts} drafts)`
    );
    console.log(
      `  - ${totalStats.relationDpI18n.total} relation-dp-i18n entries (${totalStats.relationDpI18n.published} published, ${totalStats.relationDpI18n.drafts} drafts)`
    );
  } catch (error) {
    console.error('\n❌ Error seeding data:', error.message);

    // Show detailed validation errors if available
    if (error.details && error.details.errors) {
      console.error('\n📋 Validation errors:');
      error.details.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.path || 'unknown field'}: ${err.message || err}`);
        if (err.value !== undefined) {
          console.error(`     Value: ${JSON.stringify(err.value)}`);
        }
      });
    }

    // Show full error stack in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('\n📚 Full error details:');
      console.error(error);
    }

    throw error;
  } finally {
    await strapi.destroy();
  }
}

if (require.main === module) {
  const multiplier = process.argv[2] || '1';
  seed(multiplier)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seed;
