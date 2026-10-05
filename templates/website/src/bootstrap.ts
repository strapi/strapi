import fs from 'fs';
import { set } from 'lodash';

import en from '../data/en.json';
import fr from '../data/fr.json';
import { leadFormSubmissions } from '../data/lead-form-submissions.json';

const data = {
  globals: [en.global, fr.global],
  pages: [...en.pages, ...fr.pages],
  leadFormSubmissions,
};

type FileData = {
  filepath: string;
  originalFileName: string;
  size: number;
  mimetype: string;
};

type ContentSection = {
  __component: string;
  features?: Array<Record<string, unknown>>;
  logos?: Array<Record<string, unknown>>;
  testimonials?: Array<Record<string, unknown>>;
};

type Page = {
  slug: string;
  contentSections: ContentSection[];
};

/**
 * This function will be called when the app is boostrapped.
 */
export async function bootstrap() {
  const shouldImportSeedData = await isFirstRun();
  if (shouldImportSeedData) {
    try {
      console.log('Setting up the template...');
      await importSeedData();
      console.log('Ready to go');
    } catch (error) {
      console.log('Could not import seed data');
      console.error(error);
    }
  }
}

async function isFirstRun() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });
  const initHasRun = await pluginStore.get({ key: 'initHasRun' });
  await pluginStore.set({ key: 'initHasRun', value: true });
  return !initHasRun;
}

async function setPublicPermissions(newPermissions: Record<string, string[]>) {
  // Find the ID of the public role
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: {
      type: 'public',
    },
  });

  // Create the new permissions and link them to the public role
  const allPermissionsToCreate: Array<Promise<unknown>> = [];
  Object.keys(newPermissions).map((controller) => {
    const actions = newPermissions[controller];
    const permissionsToCreate = actions.map((action) => {
      return strapi.query('plugin::users-permissions.permission').create({
        data: {
          action: `api::${controller}.${controller}.${action}`,
          role: publicRole.id,
        },
      });
    });
    allPermissionsToCreate.push(...permissionsToCreate);
  });
  await Promise.all(allPermissionsToCreate);
}

function getFileSizeInBytes(filePath: string) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats['size'];
  return fileSizeInBytes;
}

function getFileData(fileName: string): FileData {
  const filePath = `./data/uploads/${fileName}`;

  // Parse the file metadata
  const size = getFileSizeInBytes(filePath);
  const ext = fileName.split('.').pop();
  const mimeType = `image/${ext === 'svg' ? 'svg+xml' : ext}`;

  return {
    filepath: filePath,
    originalFileName: fileName,
    size,
    mimetype: mimeType,
  };
}

// Create an entry and attach files if there are any
async function createEntry(
  model: string,
  entry: Record<string, unknown>,
  files?: Record<
    string,
    {
      originalFileName: string;
      size: number;
      mimetype: string;
      filepath: string;
    }
  >
) {
  try {
    if (files) {
      for (const [key, file] of Object.entries(files)) {
        // Get file name without the extension
        const [fileName] = file.originalFileName.split('.');
        // Upload each individual file
        const uploadedFile = await strapi
          .plugin('upload')
          .service('upload')
          .upload({
            files: file,
            data: {
              fileInfo: {
                alternativeText: fileName,
                caption: fileName,
                name: fileName,
              },
            },
          });

        // Attach each file to its entry
        set(entry, key, uploadedFile[0].id);
      }
    }

    // Actually create the entry in Strapi
    await strapi.documents(`api::${model}.${model}` as any).create({
      data: entry as any,
    });
  } catch (e) {
    console.log(e);
  }
}

async function importPages(pages: Page[]) {
  const getPageCover = (slug: string): FileData | null => {
    switch (slug) {
      case '':
        return getFileData('undraw-content-team.png');
      default:
        return null;
    }
  };

  return pages.map(async (page) => {
    const files: Record<string, FileData | null> = {};
    const shareImage = getPageCover(page.slug);
    if (shareImage) {
      files['metadata.shareImage'] = shareImage;
    }
    // Check if dynamic zone has attached files
    page.contentSections.forEach((section, index) => {
      if (section.__component === 'sections.hero') {
        files[`contentSections.${index}.picture`] = getFileData('undraw-content-team.svg');
      } else if (section.__component === 'sections.feature-rows-group') {
        const getFeatureMedia = (featureIndex: number): FileData | null => {
          switch (featureIndex) {
            case 0:
              return getFileData('undraw-design-page.svg');
            case 1:
              return getFileData('undraw-create-page.svg');
            default:
              return null;
          }
        };
        section.features?.forEach((_feature, featureIndex) => {
          files[`contentSections.${index}.features.${featureIndex}.media`] =
            getFeatureMedia(featureIndex);
        });
      } else if (section.__component === 'sections.feature-columns-group') {
        const getFeatureMedia = (featureIndex: number): FileData | null => {
          switch (featureIndex) {
            case 0:
              return getFileData('preview.svg');
            case 1:
              return getFileData('devices.svg');
            case 2:
              return getFileData('palette.svg');
            default:
              return null;
          }
        };
        section.features?.forEach((_feature, featureIndex) => {
          files[`contentSections.${index}.features.${featureIndex}.icon`] =
            getFeatureMedia(featureIndex);
        });
      } else if (section.__component === 'sections.testimonials-group') {
        section.logos?.forEach((_logo, logoIndex) => {
          files[`contentSections.${index}.logos.${logoIndex}.logo`] = getFileData('logo.png');
        });
        section.testimonials?.forEach((_testimonial, testimonialIndex) => {
          files[`contentSections.${index}.testimonials.${testimonialIndex}.logo`] =
            getFileData('logo.png');
          files[`contentSections.${index}.testimonials.${testimonialIndex}.picture`] =
            getFileData('user.png');
        });
      }
    });

    await createEntry(
      'page',
      page,
      Object.fromEntries(
        Object.entries(files).filter((entry): entry is [string, FileData] => entry[1] !== null)
      )
    );
  });
}

async function importGlobal() {
  // Add images
  const files = {
    favicon: getFileData('favicon.png'),
    'metadata.shareImage': getFileData('undraw-content-team.png'),
    'navbar.logo': getFileData('logo.png'),
    'footer.logo': getFileData('logo.png'),
  };

  // Create entry
  data.globals.forEach(async (locale) => {
    await createEntry('global', locale, files);
  });
}

async function importLeadFormSubmissionData() {
  data.leadFormSubmissions.forEach(async (submission) => {
    await createEntry('lead-form-submission', submission);
  });
}

async function importSeedData() {
  // Allow read of application content types
  await setPublicPermissions({
    global: ['find'],
    page: ['find', 'findOne'],
    'lead-form-submission': ['create'],
  });

  await strapi.query('plugin::i18n.locale').create({
    data: {
      name: 'French (fr)',
      code: 'fr',
    },
  });

  // Create all entries
  await importGlobal();
  await importPages(data.pages as Page[]);
  await importLeadFormSubmissionData();
}
