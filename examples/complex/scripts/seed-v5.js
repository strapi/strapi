#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStrapi, compileStrapi } = require('@strapi/strapi');

let strapi;

const BASE_COUNTS = {
  basic: 5,
  basicDp: { published: 3, drafts: 2 },
  basicDpI18n: { published: 3, drafts: 2 },
  relation: 5,
  relationDp: { published: 5, drafts: 3 },
  relationDpI18n: { published: 5, drafts: 3 },
  mediaFiles: 10,
};

const LOCALES = ['en', 'fr'];

function parseCliArgs(argv) {
  const opts = { multiplier: 1 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--multiplier' && argv[i + 1] != null) {
      opts.multiplier = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg && arg.startsWith('--multiplier=')) {
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
  };
}

const { multiplier } = parseCliArgs(process.argv.slice(2));
const COUNTS = applyMultiplierToCounts(BASE_COUNTS, multiplier);

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
    emailField: `seed${random.string()}@example.com`,
    passwordField: 'TestPassword123!',
    jsonField: { key: random.string(), value: random.number() },
    enumerationField: random.pick(['one', 'two', 'three']),
  }),
};

const components = {
  textBlock: () => ({
    heading: `Heading ${random.string()}`,
    body: `<p>Body ${random.string(20)}</p>`,
    author: `Author ${random.string(5)}`,
    publishedDate: random.date().toISOString().split('T')[0],
  }),
  mediaBlock: () => ({
    title: `Media ${random.string()}`,
    mediaUrl: `https://example.com/media/${random.string()}.${random.pick(['jpg', 'mp4', 'mp3'])}`,
    mediaType: random.pick(['image', 'video', 'audio']),
    description: `Description ${random.string(12)}`,
  }),
  simpleInfo: () => ({
    title: `Info ${random.string()}`,
    description: `Description ${random.string(10)}`,
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
  logo: (mediaId) => ({
    name: `Logo ${random.string()}`,
    logo: mediaId || null,
  }),
  header: (mediaId) => ({
    title: `Header ${random.string()}`,
    headerlogo: components.logo(mediaId),
  }),
  referenceList: () => ({
    title: `Reference List ${random.string()}`,
    references: [{ label: `Ref ${random.string()}` }, { label: `Ref ${random.string()}` }],
  }),
  dz: (type, data) => ({ __component: `shared.${type}`, ...data }),
};

const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

async function createMediaFile(index) {
  const name = `v5-seed-${index}.png`;
  const tempPath = path.join(os.tmpdir(), name);

  try {
    fs.writeFileSync(tempPath, PNG_BUFFER);

    const result = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        files: {
          filepath: tempPath,
          path: tempPath,
          originalFilename: name,
          name,
          size: PNG_BUFFER.length,
          mimetype: 'image/png',
          type: 'image/png',
        },
        data: {
          fileInfo: {
            alternativeText: `Seed ${name}`,
            caption: name,
            name: name.replace('.png', ''),
          },
        },
      });

    return result[0] || null;
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // no-op
    }
  }
}

async function createMediaFiles() {
  console.log(`Creating ${COUNTS.mediaFiles} media files...`);
  const files = [];

  for (let i = 0; i < COUNTS.mediaFiles; i += 1) {
    const file = await createMediaFile(i + 1);
    if (file) files.push(file);
    if ((i + 1) % 50 === 0 || i + 1 === COUNTS.mediaFiles) {
      console.log(`  media: ${i + 1}/${COUNTS.mediaFiles}`);
    }
  }

  return files;
}

async function createDocument(uid, data, options = {}) {
  const { status, locale } = options;
  const payload = { data };
  if (status) payload.status = status;
  if (locale) payload.locale = locale;

  return strapi.documents(uid).create(payload);
}

async function seedBasic() {
  const items = [];
  console.log(`Seeding basic: ${COUNTS.basic}`);

  for (let i = 0; i < COUNTS.basic; i += 1) {
    const entry = await createDocument('api::basic.basic', {
      ...fields.basic(),
      textBlocks: [components.textBlock(), components.textBlock()],
      mediaBlock: components.mediaBlock(),
      sections: [
        components.dz('text-block', components.textBlock()),
        components.dz('media-block', components.mediaBlock()),
      ],
    });
    items.push(entry);
  }

  return items;
}

async function seedBasicDp(mediaFiles) {
  const published = [];
  const drafts = [];
  console.log(
    `Seeding basic-dp: ${COUNTS.basicDp.published} published / ${COUNTS.basicDp.drafts} drafts`
  );

  for (let i = 0; i < COUNTS.basicDp.published; i += 1) {
    const mediaId = mediaFiles[i % mediaFiles.length]?.id;
    const entry = await createDocument(
      'api::basic-dp.basic-dp',
      {
        ...fields.basic(),
        textBlocks: [components.textBlock(), components.textBlock()],
        mediaBlock: components.mediaBlock(),
        header: components.header(mediaId),
        sections: [
          components.dz('text-block', components.textBlock()),
          components.dz('media-block', components.mediaBlock()),
          components.dz('header', components.header(mediaId)),
        ],
      },
      { status: 'published' }
    );
    published.push(entry);
  }

  for (let i = 0; i < COUNTS.basicDp.drafts; i += 1) {
    const mediaId = mediaFiles[(i + 7) % mediaFiles.length]?.id;
    const entry = await createDocument('api::basic-dp.basic-dp', {
      ...fields.basic(),
      textBlocks: [components.textBlock(), components.textBlock()],
      mediaBlock: components.mediaBlock(),
      header: components.header(mediaId),
      sections: [
        components.dz('text-block', components.textBlock()),
        components.dz('media-block', components.mediaBlock()),
        components.dz('header', components.header(mediaId)),
      ],
    });
    drafts.push(entry);
  }

  return { published, drafts, all: [...published, ...drafts] };
}

async function seedBasicDpI18n() {
  const published = [];
  const drafts = [];
  console.log(
    `Seeding basic-dp-i18n: ${COUNTS.basicDpI18n.published} published / ${COUNTS.basicDpI18n.drafts} drafts per locale`
  );

  for (const locale of LOCALES) {
    for (let i = 0; i < COUNTS.basicDpI18n.published; i += 1) {
      const entry = await createDocument(
        'api::basic-dp-i18n.basic-dp-i18n',
        {
          ...fields.basic(),
          textBlocks: [components.textBlock(), components.textBlock()],
          mediaBlock: components.mediaBlock(),
          sections: [
            components.dz('text-block', components.textBlock()),
            components.dz('media-block', components.mediaBlock()),
          ],
        },
        { status: 'published', locale }
      );
      published.push(entry);
    }

    for (let i = 0; i < COUNTS.basicDpI18n.drafts; i += 1) {
      const entry = await createDocument(
        'api::basic-dp-i18n.basic-dp-i18n',
        {
          ...fields.basic(),
          textBlocks: [components.textBlock(), components.textBlock()],
          mediaBlock: components.mediaBlock(),
          sections: [
            components.dz('text-block', components.textBlock()),
            components.dz('media-block', components.mediaBlock()),
          ],
        },
        { locale }
      );
      drafts.push(entry);
    }
  }

  return { published, drafts, all: [...published, ...drafts] };
}

async function seedRelation() {
  const items = [];
  console.log(`Seeding relation: ${COUNTS.relation}`);

  for (let i = 0; i < COUNTS.relation; i += 1) {
    const entry = await createDocument('api::relation.relation', {
      name: `Relation ${random.string()}`,
      simpleInfo: components.simpleInfo(),
      content: [
        components.dz('simple-info', components.simpleInfo()),
        components.dz('image-block', components.imageBlock()),
      ],
      textBlocks: [components.textBlock(), components.textBlock()],
      mediaBlock: components.mediaBlock(),
      sections: [
        components.dz('text-block', components.textBlock()),
        components.dz('media-block', components.mediaBlock()),
      ],
    });
    items.push(entry);
  }

  return items;
}

async function seedRelationDp(mediaFiles) {
  const published = [];
  const drafts = [];
  console.log(
    `Seeding relation-dp: ${COUNTS.relationDp.published} published / ${COUNTS.relationDp.drafts} drafts`
  );

  for (let i = 0; i < COUNTS.relationDp.published; i += 1) {
    const mediaId = mediaFiles[i % mediaFiles.length]?.id;
    const entry = await createDocument(
      'api::relation-dp.relation-dp',
      {
        name: `Relation DP Published ${i + 1}`,
        cover: mediaId || null,
        simpleInfo: components.simpleInfo(),
        content: [
          components.dz('simple-info', components.simpleInfo()),
          components.dz('image-block', components.imageBlock()),
        ],
        textBlocks: [components.textBlock(), components.textBlock()],
        mediaBlock: components.mediaBlock(),
        header: components.header(mediaId),
        sections: [
          components.dz('text-block', components.textBlock()),
          components.dz('media-block', components.mediaBlock()),
          components.dz('header', components.header(mediaId)),
          components.dz('reference-list', components.referenceList()),
        ],
      },
      { status: 'published' }
    );
    published.push(entry);
  }

  for (let i = 0; i < COUNTS.relationDp.drafts; i += 1) {
    const mediaId = mediaFiles[(i + 11) % mediaFiles.length]?.id;
    const entry = await createDocument('api::relation-dp.relation-dp', {
      name: `Relation DP Draft ${i + 1}`,
      cover: mediaId || null,
      simpleInfo: components.simpleInfo(),
      content: [
        components.dz('simple-info', components.simpleInfo()),
        components.dz('image-block', components.imageBlock()),
      ],
      textBlocks: [components.textBlock(), components.textBlock()],
      mediaBlock: components.mediaBlock(),
      header: components.header(mediaId),
      sections: [
        components.dz('text-block', components.textBlock()),
        components.dz('media-block', components.mediaBlock()),
        components.dz('header', components.header(mediaId)),
        components.dz('reference-list', components.referenceList()),
      ],
    });
    drafts.push(entry);
  }

  return { published, drafts, all: [...published, ...drafts] };
}

async function seedRelationDpI18n() {
  const published = [];
  const drafts = [];
  console.log(
    `Seeding relation-dp-i18n: ${COUNTS.relationDpI18n.published} published / ${COUNTS.relationDpI18n.drafts} drafts per locale`
  );

  for (const locale of LOCALES) {
    for (let i = 0; i < COUNTS.relationDpI18n.published; i += 1) {
      const entry = await createDocument(
        'api::relation-dp-i18n.relation-dp-i18n',
        {
          name: `Relation DP i18n Published ${locale}-${i + 1}`,
          simpleInfo: components.simpleInfo(),
          content: [
            components.dz('simple-info', components.simpleInfo()),
            components.dz('image-block', components.imageBlock()),
          ],
          textBlocks: [components.textBlock(), components.textBlock()],
          mediaBlock: components.mediaBlock(),
          sections: [
            components.dz('text-block', components.textBlock()),
            components.dz('media-block', components.mediaBlock()),
          ],
        },
        { status: 'published', locale }
      );
      published.push(entry);
    }

    for (let i = 0; i < COUNTS.relationDpI18n.drafts; i += 1) {
      const entry = await createDocument(
        'api::relation-dp-i18n.relation-dp-i18n',
        {
          name: `Relation DP i18n Draft ${locale}-${i + 1}`,
          simpleInfo: components.simpleInfo(),
          content: [
            components.dz('simple-info', components.simpleInfo()),
            components.dz('image-block', components.imageBlock()),
          ],
          textBlocks: [components.textBlock(), components.textBlock()],
          mediaBlock: components.mediaBlock(),
          sections: [
            components.dz('text-block', components.textBlock()),
            components.dz('media-block', components.mediaBlock()),
          ],
        },
        { locale }
      );
      drafts.push(entry);
    }
  }

  return { published, drafts, all: [...published, ...drafts] };
}

async function seed() {
  console.log('🌱 Starting v5 seed...');
  console.log(`Multiplier: ${multiplier}`);
  console.log(`Counts: ${JSON.stringify(COUNTS)}\n`);

  try {
    const appContext = await compileStrapi();
    strapi = await createStrapi(appContext).load();
    strapi.log.level = 'error';

    const mediaFiles = await createMediaFiles();
    const basic = await seedBasic();
    const basicDp = await seedBasicDp(mediaFiles);
    const basicDpI18n = await seedBasicDpI18n();
    const relation = await seedRelation();
    const relationDp = await seedRelationDp(mediaFiles);
    const relationDpI18n = await seedRelationDpI18n();

    console.log('\n✅ v5 seed completed successfully');
    console.log(`  - basic: ${basic.length}`);
    console.log(`  - basic-dp: ${basicDp.all.length}`);
    console.log(`  - basic-dp-i18n: ${basicDpI18n.all.length}`);
    console.log(`  - relation: ${relation.length}`);
    console.log(`  - relation-dp: ${relationDp.all.length}`);
    console.log(`  - relation-dp-i18n: ${relationDpI18n.all.length}`);
    console.log(`  - upload files: ${mediaFiles.length}`);
  } catch (error) {
    console.error('\n❌ v5 seed failed:', error.message);
    if (error.details?.errors) {
      error.details.errors.forEach((e, index) => {
        console.error(`  ${index + 1}. ${e.path || 'unknown'}: ${e.message}`);
      });
    }
    throw error;
  } finally {
    // We intentionally do not call strapi.destroy() here.
    // In this script we rely on process exit, which avoids intermittent pool abort errors.
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seed;
