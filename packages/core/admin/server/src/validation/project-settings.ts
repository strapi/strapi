import { z } from 'zod';
import { validateZod } from '@strapi/utils';

const MAX_IMAGE_WIDTH = 750;
const MAX_IMAGE_HEIGHT = MAX_IMAGE_WIDTH;
const MAX_IMAGE_FILE_SIZE = 1024 * 1024; // 1Mo

const updateProjectSettings = z
  .object({
    menuLogo: z.string().nullish(),
    authLogo: z.string().nullish(),
  })
  .strict();

const updateProjectSettingsLogo = z.object({
  originalFilename: z.string().nullish(),
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/svg+xml']),
  size: z.number().max(MAX_IMAGE_FILE_SIZE).nullish(),
});

const updateProjectSettingsFiles = z
  .object({
    menuLogo: updateProjectSettingsLogo.nullish(),
    authLogo: updateProjectSettingsLogo.nullish(),
  })
  .strict();

const logoDimensions = z.object({
  width: z.number().max(MAX_IMAGE_WIDTH).nullish(),
  height: z.number().max(MAX_IMAGE_HEIGHT).nullish(),
});

const updateProjectSettingsImagesDimensions = z
  .object({
    menuLogo: logoDimensions.nullish(),
    authLogo: logoDimensions.nullish(),
  })
  .strict();

export const validateUpdateProjectSettings = validateZod(updateProjectSettings);
export const validateUpdateProjectSettingsFiles = validateZod(updateProjectSettingsFiles);
export const validateUpdateProjectSettingsImagesDimensions = validateZod(
  updateProjectSettingsImagesDimensions
);

export default {
  validateUpdateProjectSettings,
  validateUpdateProjectSettingsFiles,
  validateUpdateProjectSettingsImagesDimensions,
};
