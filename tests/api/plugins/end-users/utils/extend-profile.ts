import fs from 'node:fs';
import path from 'node:path';
// The stock schema, read from the plugin's source so the extension below keeps whatever the plugin
// ships (`user` above all) without a copy that could drift
import profile from '../../../../../packages/plugins/end-users/server/src/content-types/profile';

/**
 * Extends `plugin::end-users.profile` of the generated API test app the way a project does: a
 * `src/extensions/end-users/content-types/profile/schema.json` that Strapi merges over the plugin's
 * own. A schema file replaces the attribute list as a whole, so the stock attributes are repeated
 * in it, with the new ones after.
 *
 * Call it before `createEndUsersInstance`: the extension is read when the app loads. It returns the
 * function that puts the app back as it was, to call after `strapi.destroy()`.
 */
export const extendProfile = (attributes: Record<string, unknown>) => {
  const appDir = path.dirname(process.env.ENV_PATH as string);
  const pluginDir = path.join(appDir, 'src', 'extensions', 'end-users');
  const schemaFile = path.join(pluginDir, 'content-types', 'profile', 'schema.json');
  const existedBefore = fs.existsSync(pluginDir);

  fs.mkdirSync(path.dirname(schemaFile), { recursive: true });
  fs.writeFileSync(
    schemaFile,
    JSON.stringify(
      { ...profile.schema, attributes: { ...profile.schema.attributes, ...attributes } },
      null,
      2
    )
  );

  return () => {
    // Only what this wrote: the folder when it was not there before, the file when it was
    if (existedBefore) {
      fs.rmSync(schemaFile, { force: true });
    } else {
      fs.rmSync(pluginDir, { recursive: true, force: true });
    }
  };
};
