import { RenderAdminArgs, renderAdmin, Store } from '@strapi/admin/strapi-admin';
import contentTypeBuilder from '@strapi/plugin-content-type-builder/strapi-admin';
import email from '@strapi/plugin-email/strapi-admin';
// @ts-expect-error – No types, yet.
import upload from '@strapi/plugin-upload/strapi-admin';
// @ts-expect-error – No types, yet.
import contentReleases from '@strapi/content-releases/strapi-admin';

const render = (mountNode: HTMLElement | null, { plugins, ...restArgs }: RenderAdminArgs) => {
  return renderAdmin(mountNode, {
    ...restArgs,
    plugins: {
      'content-type-builder': contentTypeBuilder,
      // @ts-expect-error – TODO: fix this
      email,
      upload,
      contentReleases,
      ...plugins,
    },
  });
};

export { render as renderAdmin };
export type { RenderAdminArgs, Store };
