import { z, validateZodSchema } from '@strapi/utils';

const MAX_IMAGE_WIDTH = 750;
const MAX_IMAGE_HEIGHT = MAX_IMAGE_WIDTH;
const MAX_IMAGE_FILE_SIZE = 1024 * 1024; // 1Mo

const updateProjectSettings = z.strictObject({
  menuLogo: z.string().nullish(),
  authLogo: z.string().nullish(),
});

const updateProjectSettingsLogo = z.object({
  originalFilename: z.string().nullish(),
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/svg+xml']),
  size: z.number().max(MAX_IMAGE_FILE_SIZE).nullish(),
});

const updateProjectSettingsFiles = z.strictObject({
  menuLogo: updateProjectSettingsLogo.nullish(),
  authLogo: updateProjectSettingsLogo.nullish(),
});

const logoDimensions = z.object({
  width: z.number().max(MAX_IMAGE_WIDTH).nullish(),
  height: z.number().max(MAX_IMAGE_HEIGHT).nullish(),
});

const updateProjectSettingsImagesDimensions = z.strictObject({
  menuLogo: logoDimensions.nullish(),
  authLogo: logoDimensions.nullish(),
});

export const validateUpdateProjectSettings = validateZodSchema(updateProjectSettings);
export const validateUpdateProjectSettingsFiles = validateZodSchema(updateProjectSettingsFiles);
export const validateUpdateProjectSettingsImagesDimensions = validateZodSchema(
  updateProjectSettingsImagesDimensions
);

export default {
  validateUpdateProjectSettings,
  validateUpdateProjectSettingsFiles,
  validateUpdateProjectSettingsImagesDimensions,
};
