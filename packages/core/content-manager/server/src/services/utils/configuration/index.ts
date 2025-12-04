import { createModelConfigurationSchema } from '@content-manager/server/controllers/validation';
import {
  createDefaultSettings,
  syncSettings,
} from '@content-manager/server/services/utils/configuration/settings';
import {
  createDefaultMetadatas,
  syncMetadatas,
} from '@content-manager/server/services/utils/configuration/metadatas';
import {
  createDefaultLayouts,
  syncLayouts,
} from '@content-manager/server/services/utils/configuration/layouts';

async function validateCustomConfig(schema: any) {
  try {
    await createModelConfigurationSchema(schema, {
      allowUndefined: true,
    }).validate(schema.config);
  } catch (error: any) {
    throw new Error(
      `Invalid Model configuration for model ${schema.uid}. Verify your {{ modelName }}.config.js(on) file:\n  - ${error.message}\n`
    );
  }
}

async function createDefaultConfiguration(schema: any) {
  await validateCustomConfig(schema);

  return {
    settings: await createDefaultSettings(schema),
    metadatas: await createDefaultMetadatas(schema),
    layouts: await createDefaultLayouts(schema),
  };
}

async function syncConfiguration(conf: any, schema: any) {
  await validateCustomConfig(schema);

  return {
    settings: await syncSettings(conf, schema),
    layouts: await syncLayouts(conf, schema),
    metadatas: await syncMetadatas(conf, schema),
  };
}

export { createDefaultConfiguration, syncConfiguration };
