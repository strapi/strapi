#!/usr/bin/env node

/**
 * Seed script template for Strapi v4
 * This file will be copied to the v4 project and customized
 */

const strapi = require('@strapi/strapi')();

const INTENTIONAL_INVALID_FOREIGN_KEY_ID = 987654321;

/**
 * Parses CLI/string inputs into booleans, preserving a default when the flag is absent.
 */
function parseBoolean(value, defaultValue = true) {
  if (value === undefined) {
    return true;
  }

  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

/**
 * Converts CLI arguments into seed options. Supports:
 *   --invalid-fk / --no-invalid-fk to toggle corrupt FK injection
 *   <number> to set the seed multiplier.
 */
function parseCliArgs(args) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [flag, rawValue] = arg.split('=');

      switch (flag) {
        case '--invalid-fk':
          options.injectInvalidFk = parseBoolean(rawValue, true);
          break;
        case '--no-invalid-fk':
          options.injectInvalidFk = false;
          break;
        default:
          break;
      }
    } else if (!Number.isNaN(Number(arg))) {
      options.multiplier = arg;
    }
  }

  return options;
}

/**
 * Normalizes programmatic seed invocations so callers can pass a number, string, or object.
 */
function normalizeSeedOptions(input) {
  if (input == null) {
    return {};
  }

  if (typeof input === 'number') {
    return { multiplier: input };
  }

  if (typeof input === 'string' && !input.startsWith('--')) {
    return { multiplier: input };
  }

  if (typeof input === 'object') {
    return { ...input };
  }

  return {};
}

const quoteIdentifier = (name) => `"${String(name).replace(/"/g, '""')}"`;

/**
 * Disables FK checks while the provided callback runs, then restores them.
 * This is only used when injecting intentionally broken relations.
 */
async function withForeignKeyChecksDisabled(strapi, tables, callback) {
  const db = strapi.db.connection;
  const client = db.client.config.client;
  const tableList = Array.isArray(tables) ? tables.filter(Boolean) : [];

  const disable = async () => {
    if (client === 'sqlite' || client === 'better-sqlite3') {
      await db.raw('PRAGMA foreign_keys = OFF;');
    } else if (client === 'mysql' || client === 'mysql2' || client === 'mariadb') {
      await db.raw('SET FOREIGN_KEY_CHECKS = 0;');
    } else if (client === 'postgres' || client === 'pg') {
      for (const table of tableList) {
        await db.raw(`ALTER TABLE ${quoteIdentifier(table)} DISABLE TRIGGER ALL;`);
      }
    }
  };

  const enable = async () => {
    if (client === 'sqlite' || client === 'better-sqlite3') {
      await db.raw('PRAGMA foreign_keys = ON;');
    } else if (client === 'mysql' || client === 'mysql2' || client === 'mariadb') {
      await db.raw('SET FOREIGN_KEY_CHECKS = 1;');
    } else if (client === 'postgres' || client === 'pg') {
      for (const table of tableList) {
        await db.raw(`ALTER TABLE ${quoteIdentifier(table)} ENABLE TRIGGER ALL;`);
      }
    }
  };

  await disable();
  try {
    return await callback();
  } finally {
    try {
      await enable();
    } catch (error) {
      console.error(`  ⚠️  Failed to re-enable foreign key checks: ${error.message}`);
    }
  }
}

/**
 * Writes a handful of relations that point to a placeholder id so we can prove the
 * v5 migration copes with legacy orphaned rows instead of crashing.
 */
async function injectInvalidForeignKeyViolations(strapi, context = {}) {
  if (!context.injectInvalidFk) {
    return;
  }

  const db = strapi.db.connection;
  const invalidId = INTENTIONAL_INVALID_FOREIGN_KEY_ID;
  const tablesToDisable = new Set();
  const tasks = [];

  try {
    const relationDpMeta = strapi.db.metadata.get('api::relation-dp.relation-dp');
    const relationDpEntries = context.relationDpEntries;
    const relationDpTarget =
      relationDpEntries?.published?.[0] ||
      relationDpEntries?.drafts?.[0] ||
      relationDpEntries?.all?.[0];

    if (relationDpMeta && relationDpTarget) {
      const relationDpTable = relationDpMeta.tableName;
      const oneToOneColumn = relationDpMeta.attributes?.oneToOneBasic?.joinColumn?.name;
      if (relationDpTable && oneToOneColumn) {
        tablesToDisable.add(relationDpTable);
        tasks.push(async () => {
          await db(relationDpTable)
            .where('id', relationDpTarget.id)
            .update({
              [oneToOneColumn]: invalidId,
            });
        });
      }

      const manyToManyAttr = relationDpMeta.attributes?.manyToManyBasics;
      const joinTable = manyToManyAttr?.joinTable;
      if (joinTable?.name && joinTable?.joinColumn?.name && joinTable?.inverseJoinColumn?.name) {
        const joinTableName = joinTable.name;
        const joinColumn = joinTable.joinColumn.name;
        const inverseJoinColumn = joinTable.inverseJoinColumn.name;
        tablesToDisable.add(joinTableName);

        tasks.push(async () => {
          const existing = await db(joinTableName)
            .where({ [joinColumn]: relationDpTarget.id, [inverseJoinColumn]: invalidId })
            .first();

          if (existing) {
            return;
          }

          let sample = await db(joinTableName).where(joinColumn, relationDpTarget.id).first();
          if (!sample) {
            sample = await db(joinTableName).first();
          }

          const row = {
            [joinColumn]: relationDpTarget.id,
            [inverseJoinColumn]: invalidId,
          };

          if (sample) {
            for (const [key, value] of Object.entries(sample)) {
              if (key === joinColumn || key === inverseJoinColumn || key === 'id') {
                continue;
              }

              if (row[key] !== undefined) {
                continue;
              }

              row[key] =
                typeof value === 'number' && !Number.isNaN(value) ? Number(value) : (value ?? null);
            }

            if (Object.prototype.hasOwnProperty.call(sample, 'order')) {
              const orderValue = Number(sample.order);
              row.order = Number.isNaN(orderValue) ? 1000 : orderValue + 1000;
            }
            if (Object.prototype.hasOwnProperty.call(sample, 'position')) {
              const positionValue = Number(sample.position);
              row.position = Number.isNaN(positionValue) ? 1000 : positionValue + 1000;
            }
          } else if (
            joinTable.orderColumn?.name ||
            joinTable.orderColumn?.columnName ||
            joinTable.orderColumn?.name
          ) {
            const orderColumnName = joinTable.orderColumn.columnName || joinTable.orderColumn.name;
            if (orderColumnName) {
              row[orderColumnName] = 1000;
            }
          }

          const pivotColumns = Array.isArray(joinTable.pivotColumns) ? joinTable.pivotColumns : [];
          for (const column of pivotColumns) {
            const columnName =
              typeof column === 'string'
                ? column
                : typeof column?.name === 'string'
                  ? column.name
                  : typeof column?.columnName === 'string'
                    ? column.columnName
                    : null;
            if (!columnName || row[columnName] !== undefined) {
              continue;
            }

            const defaultValue =
              column && typeof column === 'object' && 'defaultValue' in column
                ? column.defaultValue
                : null;
            row[columnName] = defaultValue;
          }

          await db(joinTableName).insert(row);
        });
      }
    }

    const relationMeta = strapi.db.metadata.get('api::relation.relation');
    const relationEntries = context.relationEntries || [];
    const relationTarget = relationEntries[0];
    if (relationMeta && relationTarget) {
      const relationTable = relationMeta.tableName;
      const oneToOneColumn = relationMeta.attributes?.oneToOneBasic?.joinColumn?.name;
      if (relationTable && oneToOneColumn) {
        tablesToDisable.add(relationTable);
        tasks.push(async () => {
          await db(relationTable)
            .where('id', relationTarget.id)
            .update({
              [oneToOneColumn]: invalidId,
            });
        });
      }
    }

    if (tasks.length === 0) {
      return;
    }

    console.log('  ⚙️  Temporarily disabling foreign key checks to inject invalid relations...');
    await withForeignKeyChecksDisabled(strapi, Array.from(tablesToDisable), async () => {
      for (const task of tasks) {
        await task();
      }
    });

    console.log(
      `  ⚠️  Injected intentional foreign key violations using placeholder ID ${invalidId}`
    );
  } catch (error) {
    console.error(`  ❌ Failed to inject invalid foreign key relations: ${error.message}`);
  }
}

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

const createSimpleInfoComponent = () => ({
  title: `Info Title ${randomString(6)}`,
  description: `Description: ${randomString(15)}`,
  count: randomNumber(1, 100),
  active: randomBoolean(),
});

const createImageBlockComponent = () => ({
  alt: `Image ${randomString(6)}`,
  url: `https://example.com/images/${randomString(8)}.jpg`,
  caption: `Caption: ${randomString(10)}`,
  width: randomNumber(100, 2000),
  height: randomNumber(100, 2000),
});

const createSimpleInfoComponentForDynamicZone = () => ({
  __component: 'shared.simple-info',
  ...createSimpleInfoComponent(),
});

const createImageBlockComponentForDynamicZone = () => ({
  __component: 'shared.image-block',
  ...createImageBlockComponent(),
});

function createTextBlockComponent(options = {}) {
  const { relatedBasicId = null, relatedBasicDpId = null, relatedRelationDpId = null } = options;

  return {
    heading: `Heading ${randomString(6)}`,
    body: `<p>Body content: ${randomString(20)}</p>`,
    author: `Author ${randomString(4)}`,
    publishedDate: randomDate().toISOString().split('T')[0],
    relatedBasic: relatedBasicId,
    relatedBasicDp: relatedBasicDpId,
    relatedRelationDp: relatedRelationDpId,
  };
}

const createMediaBlockComponent = () => ({
  title: `Media Title ${randomString(6)}`,
  mediaUrl: `https://example.com/media/${randomString(8)}.${['jpg', 'mp4', 'mp3'][randomNumber(0, 2)]}`,
  mediaType: ['image', 'video', 'audio'][randomNumber(0, 2)],
  description: `Media description: ${randomString(15)}`,
});

const createTextBlockComponentForDynamicZone = (options = {}) => ({
  __component: 'shared.text-block',
  ...createTextBlockComponent(options),
});

const createMediaBlockComponentForDynamicZone = () => ({
  __component: 'shared.media-block',
  ...createMediaBlockComponent(),
});

const pickCyclic = (items, index, fallback = null) => {
  if (!Array.isArray(items) || items.length === 0) {
    return fallback ?? null;
  }

  const normalizedIndex = ((index % items.length) + items.length) % items.length;
  return items[normalizedIndex] ?? fallback ?? null;
};

async function updateBasicComponentRelations(strapi, basicEntries, basicDpEntries) {
  if (!Array.isArray(basicEntries) || basicEntries.length === 0) {
    return;
  }

  const publishedDpEntries = Array.isArray(basicDpEntries?.published)
    ? basicDpEntries.published
    : [];
  const draftDpEntries = Array.isArray(basicDpEntries?.drafts) ? basicDpEntries.drafts : [];
  const fallbackDpEntries = Array.isArray(basicDpEntries?.all)
    ? basicDpEntries.all
    : [...publishedDpEntries, ...draftDpEntries];

  // Ensure we have at least one published target for each basic entry
  if (publishedDpEntries.length === 0 && fallbackDpEntries.length > 0) {
    console.warn(
      '  ⚠️  WARNING: No published basic-dp entries available, using fallback entries for component relations'
    );
  }

  for (let index = 0; index < basicEntries.length; index += 1) {
    const entry = basicEntries[index];
    if (!entry) {
      continue;
    }

    const nextBasic = pickCyclic(basicEntries, index + 1, entry);
    const altBasic = pickCyclic(basicEntries, index + 2, nextBasic);

    // Always try to get a published target first, fallback to any entry if needed
    let publishedTarget = pickCyclic(publishedDpEntries, index, null);
    if (!publishedTarget && fallbackDpEntries.length > 0) {
      // If no published entries, use any entry but prefer published ones
      const fallback = pickCyclic(fallbackDpEntries, index, null);
      // Only use fallback if it's actually published, otherwise try to find a published one
      if (fallback && fallback.publishedAt) {
        publishedTarget = fallback;
      } else if (publishedDpEntries.length > 0) {
        // If we have published entries but index is out of bounds, wrap around
        publishedTarget = publishedDpEntries[index % publishedDpEntries.length];
      }
    }

    // For draft target, prefer draft entries but fallback to published if needed
    let draftTarget = pickCyclic(draftDpEntries, index, null);
    if (!draftTarget) {
      // If no draft entries available, use published as fallback
      draftTarget = publishedTarget ?? pickCyclic(fallbackDpEntries, index + 1, null);
    }

    const publishedTargetId = publishedTarget?.id ?? null;
    const draftTargetId = draftTarget?.id ?? publishedTargetId;

    // Ensure we have at least one published target in the textBlocks
    const textBlocks = [
      createTextBlockComponent({
        relatedBasicId: nextBasic?.id ?? null,
        relatedBasicDpId: publishedTargetId, // First text-block always targets published if available
      }),
      createTextBlockComponent({
        relatedBasicId: altBasic?.id ?? nextBasic?.id ?? null,
        relatedBasicDpId: draftTargetId, // Second text-block targets draft
      }),
    ];

    const sections = [
      createTextBlockComponentForDynamicZone({
        relatedBasicId: nextBasic?.id ?? null,
        relatedBasicDpId: draftTargetId, // Dynamic zone targets draft
      }),
      createMediaBlockComponentForDynamicZone(),
    ];

    await strapi.entityService.update('api::basic.basic', entry.id, {
      data: {
        textBlocks,
        sections,
      },
    });
  }
}

async function updateBasicDpComponentRelations(
  strapi,
  basicEntries,
  publishedEntries,
  draftEntries
) {
  const safeBasicEntries = Array.isArray(basicEntries) ? basicEntries : [];
  const safePublishedEntries = Array.isArray(publishedEntries) ? publishedEntries : [];
  const safeDraftEntries = Array.isArray(draftEntries) ? draftEntries : [];
  const hasBasics = safeBasicEntries.length > 0;

  const updateEntry = async (entry, index, stage) => {
    if (!entry) {
      return;
    }

    const primaryBasic = hasBasics
      ? pickCyclic(safeBasicEntries, index, safeBasicEntries[0])
      : null;
    const secondaryBasic = hasBasics ? pickCyclic(safeBasicEntries, index + 1, primaryBasic) : null;

    // Always ensure we have a published target available
    const publishedTarget = pickCyclic(safePublishedEntries, index, null);
    const draftTarget = pickCyclic(safeDraftEntries, index, publishedTarget);

    // For draft entries: ensure at least one text-block targets a published entry
    // For published entries: ensure at least one text-block targets a published entry
    // This ensures the validation requirement is met
    const firstTarget =
      stage === 'draft'
        ? (publishedTarget ?? draftTarget) // Draft entries: first target should be published if available
        : (publishedTarget ?? draftTarget); // Published entries: first target should be published
    const secondTarget =
      stage === 'draft'
        ? (draftTarget ?? publishedTarget) // Draft entries: second target can be draft
        : (draftTarget ?? publishedTarget); // Published entries: second target can be draft

    const textBlocks = [
      createTextBlockComponent({
        relatedBasicId: primaryBasic?.id ?? null,
        relatedBasicDpId: firstTarget?.id ?? null, // First always targets published (if available)
      }),
      createTextBlockComponent({
        relatedBasicId: secondaryBasic?.id ?? primaryBasic?.id ?? null,
        relatedBasicDpId: secondTarget?.id ?? firstTarget?.id ?? null, // Second targets draft (or published if no draft)
      }),
    ];

    const sections = [
      createTextBlockComponentForDynamicZone({
        relatedBasicId: primaryBasic?.id ?? null,
        relatedBasicDpId: secondTarget?.id ?? firstTarget?.id ?? null, // Dynamic zone can target either
      }),
      createMediaBlockComponentForDynamicZone(),
    ];

    await strapi.entityService.update('api::basic-dp.basic-dp', entry.id, {
      data: {
        textBlocks,
        sections,
      },
    });
  };

  for (let index = 0; index < safePublishedEntries.length; index += 1) {
    await updateEntry(safePublishedEntries[index], index, 'published');
  }

  for (let index = 0; index < safeDraftEntries.length; index += 1) {
    await updateEntry(safeDraftEntries[index], index, 'draft');
  }
}

async function updateBasicDpI18nComponentRelations(
  strapi,
  basicEntries,
  basicDpEntries,
  localizedEntries
) {
  const safeBasicEntries = Array.isArray(basicEntries) ? basicEntries : [];
  const safePublishedDp = Array.isArray(basicDpEntries?.published) ? basicDpEntries.published : [];
  const safeDraftDp = Array.isArray(basicDpEntries?.drafts) ? basicDpEntries.drafts : [];
  const fallbackDp = Array.isArray(basicDpEntries?.all)
    ? basicDpEntries.all
    : [...safePublishedDp, ...safeDraftDp];

  const hasBasics = safeBasicEntries.length > 0;

  const updateEntry = async (entry, index, stage) => {
    if (!entry) {
      return;
    }

    const primaryBasic = hasBasics
      ? pickCyclic(safeBasicEntries, index, safeBasicEntries[0])
      : null;
    const secondaryBasic = hasBasics ? pickCyclic(safeBasicEntries, index + 1, primaryBasic) : null;

    const publishedTarget =
      pickCyclic(safePublishedDp, index, pickCyclic(fallbackDp, index, null)) ??
      pickCyclic(safeDraftDp, index, null);
    const draftTarget =
      pickCyclic(safeDraftDp, index, publishedTarget) ??
      pickCyclic(fallbackDp, index + 1, publishedTarget);

    const firstTarget =
      stage === 'draft' ? (draftTarget ?? publishedTarget) : (publishedTarget ?? draftTarget);
    const secondTarget =
      stage === 'draft' ? (publishedTarget ?? draftTarget) : (draftTarget ?? publishedTarget);

    const textBlocks = [
      createTextBlockComponent({
        relatedBasicId: primaryBasic?.id ?? null,
        relatedBasicDpId: firstTarget?.id ?? secondTarget?.id ?? null,
      }),
      createTextBlockComponent({
        relatedBasicId: secondaryBasic?.id ?? primaryBasic?.id ?? null,
        relatedBasicDpId: secondTarget?.id ?? firstTarget?.id ?? null,
      }),
    ];

    const sections = [
      createTextBlockComponentForDynamicZone({
        relatedBasicId: primaryBasic?.id ?? null,
        relatedBasicDpId: secondTarget?.id ?? firstTarget?.id ?? null,
      }),
      createMediaBlockComponentForDynamicZone(),
    ];

    await strapi.entityService.update('api::basic-dp-i18n.basic-dp-i18n', entry.id, {
      data: {
        textBlocks,
        sections,
      },
      locale: entry.locale,
    });
  };

  const safePublishedEntries = Array.isArray(localizedEntries?.published)
    ? localizedEntries.published
    : [];
  const safeDraftEntries = Array.isArray(localizedEntries?.drafts) ? localizedEntries.drafts : [];

  for (let index = 0; index < safePublishedEntries.length; index += 1) {
    await updateEntry(safePublishedEntries[index], index, 'published');
  }

  for (let index = 0; index < safeDraftEntries.length; index += 1) {
    await updateEntry(safeDraftEntries[index], index, 'draft');
  }
}

/**
 * Bypasses Strapi validation to drop invalid enum values directly into the database.
 * This checks that migrations surface unexpected scalars gracefully.
 */
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

/**
 * Seeds the non-DP sample type, injecting enough records to exercise repeatable
 * components, dynamic zones, and validation edge cases.
 */
async function seedBasic(strapi) {
  console.log('Seeding basic...');
  const entries = [];
  for (let i = 0; i < 5; i++) {
    try {
      const data = {
        ...createBasicFields(),
        textBlocks: [createTextBlockComponent(), createTextBlockComponent()],
        mediaBlock: createMediaBlockComponent(),
        sections: [
          createTextBlockComponentForDynamicZone(),
          createMediaBlockComponentForDynamicZone(),
        ],
      };
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

  await injectInvalidEnumValuesForTable(strapi, entries, 'basics');

  return entries;
}

/**
 * Seeds draft/publish content with a mix of published entries and drafts so the
 * migration has meaningful data to clone.
 */
async function seedBasicDp(strapi, basicEntries) {
  console.log('Seeding basic-dp...');
  const published = [];
  const drafts = [];

  // Create published entries
  for (let i = 0; i < 3; i++) {
    try {
      const entry = await strapi.entityService.create('api::basic-dp.basic-dp', {
        data: {
          ...createBasicFields(),
          textBlocks: [createTextBlockComponent(), createTextBlockComponent()],
          mediaBlock: createMediaBlockComponent(),
          sections: [
            createTextBlockComponentForDynamicZone(),
            createMediaBlockComponentForDynamicZone(),
          ],
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
        data: {
          ...createBasicFields(),
          textBlocks: [createTextBlockComponent(), createTextBlockComponent()],
          mediaBlock: createMediaBlockComponent(),
          sections: [
            createTextBlockComponentForDynamicZone(),
            createMediaBlockComponentForDynamicZone(),
          ],
        },
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

  await updateBasicDpComponentRelations(strapi, basicEntries, published, drafts);
  await injectInvalidEnumValuesForTable(strapi, allEntries, 'basic_dps');

  return { published, drafts, all: allEntries };
}

/**
 * Same as `seedBasicDp`, but across multiple locales to stress the i18n pathways.
 */
async function seedBasicDpI18n(strapi, basicEntries, basicDpEntries) {
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
            textBlocks: [createTextBlockComponent(), createTextBlockComponent()],
            mediaBlock: createMediaBlockComponent(),
            sections: [
              createTextBlockComponentForDynamicZone(),
              createMediaBlockComponentForDynamicZone(),
            ],
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
          data: {
            ...createBasicFields(),
            textBlocks: [createTextBlockComponent(), createTextBlockComponent()],
            mediaBlock: createMediaBlockComponent(),
            sections: [
              createTextBlockComponentForDynamicZone(),
              createMediaBlockComponentForDynamicZone(),
            ],
          },
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

  await updateBasicDpI18nComponentRelations(strapi, basicEntries, basicDpEntries, entries);
  await injectInvalidEnumValuesForTable(strapi, entries.all, 'basic_dp_i18ns');

  return entries;
}

/**
 * Creates relation records that reference both DP and non-DP entities so we can verify
 * every association survives the migration.
 */
async function seedRelation(strapi, basicEntries, basicDpEntries) {
  console.log('Seeding relation...');
  const entries = [];

  const publishedDpTargets = Array.isArray(basicDpEntries?.published)
    ? basicDpEntries.published
    : [];
  const draftDpTargets = Array.isArray(basicDpEntries?.drafts) ? basicDpEntries.drafts : [];
  const fallbackDpTargets =
    Array.isArray(basicDpEntries?.all) && basicDpEntries.all.length > 0
      ? basicDpEntries.all
      : [...publishedDpTargets, ...draftDpTargets];

  for (let i = 0; i < 5; i++) {
    try {
      const relatedBasics = basicEntries.slice(0, randomNumber(1, 3));
      const firstRelatedBasic = relatedBasics[0] || basicEntries[0] || null;
      const secondRelatedBasic =
        relatedBasics[1] || relatedBasics[0] || basicEntries[1] || firstRelatedBasic;
      const firstRelatedBasicId = firstRelatedBasic ? firstRelatedBasic.id : null;
      const secondRelatedBasicId = secondRelatedBasic ? secondRelatedBasic.id : firstRelatedBasicId;

      const publishedDpTarget =
        pickCyclic(publishedDpTargets, i, pickCyclic(fallbackDpTargets, i, null)) ??
        pickCyclic(draftDpTargets, i, null);
      const draftDpTarget =
        pickCyclic(draftDpTargets, i, publishedDpTarget) ??
        pickCyclic(fallbackDpTargets, i + 1, publishedDpTarget);

      const publishedDpTargetId = publishedDpTarget?.id ?? null;
      const draftDpTargetId = draftDpTarget?.id ?? publishedDpTargetId;

      const data = {
        name: `Relation ${randomString(6)}`,
        oneToOneBasic: relatedBasics[0]?.id || null,
        oneToManyBasics: relatedBasics.map((b) => b.id),
        manyToOneBasic: relatedBasics[0]?.id || null,
        manyToManyBasics: relatedBasics.map((b) => b.id),
        simpleInfo: createSimpleInfoComponent(),
        content: [
          createSimpleInfoComponentForDynamicZone(),
          createImageBlockComponentForDynamicZone(),
        ],
        textBlocks: [
          createTextBlockComponent({
            relatedBasicId: firstRelatedBasicId,
            relatedBasicDpId: publishedDpTargetId,
          }),
          createTextBlockComponent({
            relatedBasicId: secondRelatedBasicId,
            relatedBasicDpId: draftDpTargetId,
          }),
        ],
        mediaBlock: createMediaBlockComponent(),
        sections: [
          createTextBlockComponentForDynamicZone({
            relatedBasicId: firstRelatedBasicId,
            relatedBasicDpId: draftDpTargetId,
          }),
          createMediaBlockComponentForDynamicZone(),
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

/**
 * Builds DP relation entries pointing at both draft and published basics so migrations
 * must remap targets in every combination.
 */
async function seedRelationDp(strapi, basicDpEntries, basicEntries = []) {
  console.log('Seeding relation-dp...');
  const published = [];
  const drafts = [];

  const allBasics = basicDpEntries.all || [];
  const publishedBasics = basicDpEntries.published || [];
  const draftBasics = basicDpEntries.drafts || [];

  // Create published entries - relate to BOTH published and draft basics
  for (let i = 0; i < 5; i++) {
    try {
      const publishedTarget =
        pickCyclic(publishedBasics, i, pickCyclic(allBasics, i, null)) ??
        pickCyclic(draftBasics, i, null);
      const draftTarget =
        pickCyclic(draftBasics, i, publishedTarget) ??
        pickCyclic(allBasics, i + 1, publishedTarget);

      const relatedBasics = [publishedTarget, draftTarget].filter(Boolean);
      if (relatedBasics.length === 0 && allBasics.length > 0) {
        relatedBasics.push(pickCyclic(allBasics, i, allBasics[0]));
      }

      const firstRelatedBasic = relatedBasics[0] || allBasics[0] || null;
      const secondRelatedBasic =
        relatedBasics[1] || relatedBasics[0] || allBasics[1] || firstRelatedBasic;
      const firstRelatedBasicId = firstRelatedBasic ? firstRelatedBasic.id : null;
      const secondRelatedBasicId = secondRelatedBasic ? secondRelatedBasic.id : firstRelatedBasicId;

      // Also relate to basic (without D&P) to test the duplicate relation issue
      const relatedBasicNoDp = pickCyclic(basicEntries, i, basicEntries[0] || null);
      const relatedBasicsNoDp =
        basicEntries.length > 0
          ? [relatedBasicNoDp, pickCyclic(basicEntries, i + 1, relatedBasicNoDp)].filter(Boolean)
          : [];

      const entry = await strapi.entityService.create('api::relation-dp.relation-dp', {
        data: {
          name: `Relation DP Published ${i + 1} ${randomString(4)}`,
          oneToOneBasic: relatedBasics[0]?.id || null,
          oneToManyBasics: relatedBasics.map((b) => b.id),
          manyToOneBasic: relatedBasics[0]?.id || null,
          manyToManyBasics: relatedBasics.map((b) => b.id),
          manyToOneBasicNoDp: relatedBasicNoDp?.id || null,
          manyToManyBasicsNoDp: relatedBasicsNoDp.map((b) => b.id),
          simpleInfo: createSimpleInfoComponent(),
          content: [
            createSimpleInfoComponentForDynamicZone(),
            createImageBlockComponentForDynamicZone(),
          ],
          textBlocks: [
            createTextBlockComponent({ relatedBasicDpId: firstRelatedBasicId }),
            createTextBlockComponent({ relatedBasicDpId: secondRelatedBasicId }),
          ],
          mediaBlock: createMediaBlockComponent(),
          sections: [
            createTextBlockComponentForDynamicZone({
              relatedBasicDpId: draftTarget?.id ?? firstRelatedBasicId,
            }),
            createMediaBlockComponentForDynamicZone(),
          ],
          publishedAt: new Date(),
        },
      });

      await strapi.entityService.update('api::relation-dp.relation-dp', entry.id, {
        data: {
          textBlocks: [
            createTextBlockComponent({
              relatedBasicDpId: firstRelatedBasicId,
              relatedRelationDpId: entry.id,
            }),
            createTextBlockComponent({
              relatedBasicDpId: secondRelatedBasicId,
              relatedRelationDpId: entry.id,
            }),
          ],
          sections: [
            createTextBlockComponentForDynamicZone({
              relatedBasicDpId: draftTarget?.id ?? firstRelatedBasicId,
              relatedRelationDpId: entry.id,
            }),
            createMediaBlockComponentForDynamicZone(),
          ],
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
      const draftTarget =
        pickCyclic(draftBasics, i, pickCyclic(allBasics, i, null)) ??
        pickCyclic(publishedBasics, i, null);
      const publishedTarget =
        pickCyclic(publishedBasics, i, draftTarget) ?? pickCyclic(allBasics, i + 1, draftTarget);

      const relatedBasics = [draftTarget, publishedTarget].filter(Boolean);
      if (relatedBasics.length === 0 && allBasics.length > 0) {
        relatedBasics.push(pickCyclic(allBasics, i, allBasics[0]));
      }

      const firstRelatedBasic = relatedBasics[0] || allBasics[0] || null;
      const secondRelatedBasic =
        relatedBasics[1] || relatedBasics[0] || allBasics[1] || firstRelatedBasic;
      const firstRelatedBasicId = firstRelatedBasic ? firstRelatedBasic.id : null;
      const secondRelatedBasicId = secondRelatedBasic ? secondRelatedBasic.id : firstRelatedBasicId;

      // Also relate to basic (without D&P) to test the duplicate relation issue
      const relatedBasicNoDp = pickCyclic(basicEntries, i, basicEntries[0] || null);
      const relatedBasicsNoDp =
        basicEntries.length > 0
          ? [relatedBasicNoDp, pickCyclic(basicEntries, i + 1, relatedBasicNoDp)].filter(Boolean)
          : [];

      const entry = await strapi.entityService.create('api::relation-dp.relation-dp', {
        data: {
          name: `Relation DP Draft ${i + 1} ${randomString(4)}`,
          oneToOneBasic: relatedBasics[0]?.id || null,
          oneToManyBasics: relatedBasics.map((b) => b.id),
          manyToOneBasic: relatedBasics[0]?.id || null,
          manyToManyBasics: relatedBasics.map((b) => b.id),
          manyToOneBasicNoDp: relatedBasicNoDp?.id || null,
          manyToManyBasicsNoDp: relatedBasicsNoDp.map((b) => b.id),
          simpleInfo: createSimpleInfoComponent(),
          content: [
            createSimpleInfoComponentForDynamicZone(),
            createImageBlockComponentForDynamicZone(),
          ],
          textBlocks: [
            createTextBlockComponent({ relatedBasicDpId: firstRelatedBasicId }),
            createTextBlockComponent({ relatedBasicDpId: secondRelatedBasicId }),
          ],
          mediaBlock: createMediaBlockComponent(),
          sections: [
            createTextBlockComponentForDynamicZone({
              relatedBasicDpId: draftTarget?.id ?? firstRelatedBasicId,
            }),
            createMediaBlockComponentForDynamicZone(),
          ],
          // No publishedAt = draft
        },
      });

      await strapi.entityService.update('api::relation-dp.relation-dp', entry.id, {
        data: {
          textBlocks: [
            createTextBlockComponent({
              relatedBasicDpId: firstRelatedBasicId,
              relatedRelationDpId: entry.id,
            }),
            createTextBlockComponent({
              relatedBasicDpId: secondRelatedBasicId,
              relatedRelationDpId: entry.id,
            }),
          ],
          sections: [
            createTextBlockComponentForDynamicZone({
              relatedBasicDpId: draftTarget?.id ?? firstRelatedBasicId,
              relatedRelationDpId: entry.id,
            }),
            createMediaBlockComponentForDynamicZone(),
          ],
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

/**
 * Localized counterpart of `seedRelationDp`, ensuring relations plus localization
 * survive the migration.
 */
async function seedRelationDpI18n(strapi, basicDpI18nEntries) {
  console.log('Seeding relation-dp-i18n...');
  const locales = ['en', 'fr'];
  const entries = { published: [], drafts: [] };

  const allBasics = basicDpI18nEntries.all || [];
  const publishedBasics = basicDpI18nEntries.published || [];
  const draftBasics = basicDpI18nEntries.drafts || [];

  // Create entries in each locale
  for (const locale of locales) {
    const basicsForLocale = allBasics.filter((basic) => basic.locale === locale);
    const fallbackBasics = basicsForLocale.length > 0 ? basicsForLocale : allBasics;
    const publishedBasicsForLocale = publishedBasics.filter((basic) => basic.locale === locale);
    const draftBasicsForLocale = draftBasics.filter((basic) => basic.locale === locale);

    for (let i = 0; i < 5; i++) {
      try {
        const publishedRelated = publishedBasicsForLocale.slice(0, randomNumber(0, 2));
        const draftRelated = draftBasicsForLocale.slice(0, randomNumber(0, 2));
        let relatedBasics = [...publishedRelated, ...draftRelated];
        if (relatedBasics.length === 0 && fallbackBasics.length > 0) {
          relatedBasics = [fallbackBasics[randomNumber(0, fallbackBasics.length - 1)]];
        }

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
            textBlocks: [createTextBlockComponent(), createTextBlockComponent()],
            mediaBlock: createMediaBlockComponent(),
            sections: [
              createTextBlockComponentForDynamicZone(),
              createMediaBlockComponentForDynamicZone(),
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

    for (let i = 0; i < 3; i++) {
      try {
        const publishedRelated = publishedBasicsForLocale.slice(0, randomNumber(0, 2));
        const draftRelated = draftBasicsForLocale.slice(0, randomNumber(0, 2));
        let relatedBasics = [...publishedRelated, ...draftRelated];
        if (relatedBasics.length === 0 && fallbackBasics.length > 0) {
          relatedBasics = [fallbackBasics[randomNumber(0, fallbackBasics.length - 1)]];
        }

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
            textBlocks: [createTextBlockComponent(), createTextBlockComponent()],
            mediaBlock: createMediaBlockComponent(),
            sections: [
              createTextBlockComponentForDynamicZone(),
              createMediaBlockComponentForDynamicZone(),
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

/**
 * Runs one full pass of the fixture generation pipeline. Used by the CLI loop and
 * by integration tests to request a single dataset programmatically.
 */
async function seedSingleRun(strapi, options = {}) {
  const injectInvalidFk = options.injectInvalidFk === true;

  const basicEntries = await seedBasic(strapi);
  const basicDpEntries = await seedBasicDp(strapi, basicEntries);
  await updateBasicComponentRelations(strapi, basicEntries, basicDpEntries);
  const basicDpI18nEntries = await seedBasicDpI18n(strapi, basicEntries, basicDpEntries);

  const relationEntries = await seedRelation(strapi, basicEntries, basicDpEntries);
  const relationDpEntries = await seedRelationDp(strapi, basicDpEntries, basicEntries);
  const relationDpI18nEntries = await seedRelationDpI18n(strapi, basicDpI18nEntries);

  if (injectInvalidFk) {
    await injectInvalidForeignKeyViolations(strapi, {
      relationEntries,
      relationDpEntries,
      injectInvalidFk,
    });
  }

  return {
    basicEntries,
    basicDpEntries,
    basicDpI18nEntries,
    relationEntries,
    relationDpEntries,
    relationDpI18nEntries,
  };
}

/**
 * Verifies that seeded data has the expected component relations
 */
async function verifySeededData(strapi) {
  console.log('\n🔍 Verifying seeded component relations...\n');

  try {
    // Check basic entries
    const basicEntries = await strapi.entityService.findMany('api::basic.basic', {
      populate: {
        textBlocks: {
          populate: {
            relatedBasicDp: { fields: ['id', 'publishedAt'] },
          },
        },
      },
    });

    let basicPublishedTargets = 0;
    let basicDraftTargets = 0;
    for (const entry of basicEntries) {
      for (const textBlock of entry.textBlocks || []) {
        const target = textBlock?.relatedBasicDp;
        if (target) {
          if (target.publishedAt) {
            basicPublishedTargets += 1;
          } else {
            basicDraftTargets += 1;
          }
        }
      }
    }
    console.log(
      `  Basic entries: ${basicPublishedTargets} text-blocks target published, ${basicDraftTargets} target drafts`
    );

    // Check basic-dp entries
    // Use db.query to get both draft and published entries
    const basicDpEntries = await strapi.db.query('api::basic-dp.basic-dp').findMany({
      populate: {
        textBlocks: {
          populate: {
            relatedBasicDp: { fields: ['id', 'publishedAt'] },
          },
        },
      },
    });

    let publishedEntriesWithPublishedTargets = 0;
    let publishedEntriesWithDraftTargets = 0;
    let draftEntriesWithPublishedTargets = 0;
    let draftEntriesWithDraftTargets = 0;

    for (const entry of basicDpEntries) {
      const isPublished = !!entry.publishedAt;
      let hasPublishedTarget = false;
      let hasDraftTarget = false;

      for (const textBlock of entry.textBlocks || []) {
        const target = textBlock?.relatedBasicDp;
        if (target) {
          if (target.publishedAt) {
            hasPublishedTarget = true;
          } else {
            hasDraftTarget = true;
          }
        }
      }

      if (isPublished) {
        if (hasPublishedTarget) publishedEntriesWithPublishedTargets += 1;
        if (hasDraftTarget) publishedEntriesWithDraftTargets += 1;
      } else {
        if (hasPublishedTarget) draftEntriesWithPublishedTargets += 1;
        if (hasDraftTarget) draftEntriesWithDraftTargets += 1;
      }
    }

    console.log(
      `  Basic-dp published: ${publishedEntriesWithPublishedTargets} have published targets, ${publishedEntriesWithDraftTargets} have draft targets`
    );
    console.log(
      `  Basic-dp drafts: ${draftEntriesWithPublishedTargets} have published targets, ${draftEntriesWithDraftTargets} have draft targets`
    );

    if (basicPublishedTargets === 0) {
      console.log('  ⚠️  WARNING: No basic entries have text-blocks targeting published basic-dp');
    }
    if (publishedEntriesWithPublishedTargets === 0) {
      console.log(
        '  ⚠️  WARNING: No published basic-dp entries have text-blocks targeting published basic-dp'
      );
    }
    if (draftEntriesWithPublishedTargets === 0) {
      console.log(
        '  ⚠️  WARNING: No draft basic-dp entries have text-blocks targeting published basic-dp'
      );
    }
  } catch (error) {
    console.error(`  ❌ Error verifying seeded data: ${error.message}`);
  }
}

/**
 * User-facing entry point invoked from the CLI. Supports running the seed multiple
 * times and optionally injecting orphaned relations.
 */
async function seed(options = {}) {
  const normalizedOptions = normalizeSeedOptions(options);
  const multiplierNum = parseInt(normalizedOptions.multiplier, 10) || 1;
  const injectInvalidFk = normalizedOptions.injectInvalidFk === true;

  console.log(
    `🌱 Starting seed (multiplier: ${multiplierNum}${injectInvalidFk ? ', invalid FK injection ENABLED' : ''})...\n`
  );

  try {
    await strapi.load();
  } catch (error) {
    if (error.message && (error.message.includes('already exists') || error.code === '42P07')) {
      console.error('\n❌ Migration error: Database already has migrations applied.');
      console.error(
        '   The seed script expects a clean database or one that has been properly migrated.'
      );
      console.error('\n   Try one of these solutions:');
      console.error('   1. Wipe the database first (from v5 project): yarn db:wipe:{your db type}');
      console.error('   2. Or ensure the database is in a clean state before seeding\n');
      console.error(`   Error details: ${error.message}`);
      process.exit(1);
    } else {
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

      const stats = await seedSingleRun(strapi, { injectInvalidFk });

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

    // Verify seeded data
    await verifySeededData(strapi);

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

    if (error.details && error.details.errors) {
      console.error('\n📋 Validation errors:');
      error.details.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.path || 'unknown field'}: ${err.message || err}`);
        if (err.value !== undefined) {
          console.error(`     Value: ${JSON.stringify(err.value)}`);
        }
      });
    }

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
  const cliOptions = parseCliArgs(process.argv.slice(2));
  seed(cliOptions)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seed;
