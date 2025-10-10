import { RenderAdminArgs, renderAdmin } from '@strapi/admin/strapi-admin';
import contentTypeBuilder from '@strapi/content-type-builder/strapi-admin';
import contentManager from '@strapi/content-manager/strapi-admin';
import email from '@strapi/email/strapi-admin';
import upload from '@strapi/upload/strapi-admin';
import i18n from '@strapi/i18n/strapi-admin';
import contentReleases from '@strapi/content-releases/strapi-admin';
import reviewWorkflows from '@strapi/review-workflows/strapi-admin';

const render = (mountNode: HTMLElement | null, { plugins, ...restArgs }: RenderAdminArgs) => {
  return renderAdmin(mountNode, {
    ...restArgs,
    plugins: {
      'content-manager': contentManager,
      'content-type-builder': contentTypeBuilder,
      email,
      upload,
      contentReleases,
      i18n,
      reviewWorkflows,
      ...plugins,
    },
  });
};

export { render as renderAdmin };
export type { RenderAdminArgs };

export * from '@strapi/admin/strapi-admin';

export {
  unstable_useDocumentLayout,
  unstable_useDocumentActions,
  unstable_useDocument,
  unstable_useContentManagerContext,
  useDocumentRBAC,
} from '@strapi/content-manager/strapi-admin';

export {
  private_useAutoReloadOverlayBlocker,
  private_AutoReloadOverlayBlockerProvider,
} from '@strapi/content-type-builder/strapi-admin';
