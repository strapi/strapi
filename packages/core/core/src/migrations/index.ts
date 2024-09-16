import * as draftPublishMigrations from './draft-publish';
import * as i18nMigrations from './i18n';
import type { Input } from './draft-publish';

const enable = async ({ oldContentTypes, contentTypes }: Input) => {
  await i18nMigrations.enable({ oldContentTypes, contentTypes });
  await draftPublishMigrations.enable({ oldContentTypes, contentTypes });
};

const disable = async ({ oldContentTypes, contentTypes }: Input) => {
  await i18nMigrations.disable({ oldContentTypes, contentTypes });
  await draftPublishMigrations.disable({ oldContentTypes, contentTypes });
};

export { enable, disable };
