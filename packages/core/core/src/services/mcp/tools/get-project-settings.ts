import * as z from 'zod';
import { makeMcpToolDefinition } from '../tool-registry';

const projectSettingsSchema = z.object({
  menuLogo: z
    .object({
      name: z.string(),
      url: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      ext: z.string(),
      size: z.number(),
    })
    .nullable()
    .optional(),
  authLogo: z
    .object({
      name: z.string(),
      url: z.string(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      ext: z.string(),
      size: z.number(),
    })
    .nullable()
    .optional(),
});

export const getProjectSettingsToolDefinition = makeMcpToolDefinition({
  name: 'get_project_settings',
  title: 'Get Project Settings',
  description: 'Retrieves Strapi project settings including logos and menu configuration',
  outputSchema: projectSettingsSchema,
  auth: {
    actions: ['admin::project-settings.read'],
  },
  createHandler: (strapi) => async () => {
    // Access admin service
    const projectSettingsService = strapi.admin.services['project-settings'];
    const projectSettings = await projectSettingsService.getProjectSettings();

    const settings = projectSettingsSchema.parse({
      // Settings have an unexpected behavior where empty objects are returned instead of null when at least one value is/has been populated
      menuLogo:
        projectSettings.menuLogo !== null && Object.keys(projectSettings.menuLogo).length > 0
          ? projectSettings.menuLogo
          : null,
      authLogo:
        projectSettings.authLogo !== null && Object.keys(projectSettings.authLogo).length > 0
          ? projectSettings.authLogo
          : null,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(settings, null, 2),
        },
      ],
      structuredContent: settings,
    };
  },
});
