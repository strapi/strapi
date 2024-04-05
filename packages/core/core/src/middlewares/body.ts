import fse from 'fs-extra';
import { defaultsDeep } from 'lodash/fp';
import body, { KoaBodyMiddlewareOptions } from 'koa-body';
import mime from 'mime-types';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

export type Config = KoaBodyMiddlewareOptions;

const defaults = {
  multipart: true,
  patchKoa: true,
};

function ensureFileMimeType(file: any): void {
  if (!file.type) {
    file.type = mime.lookup(file.name) || 'application/octet-stream';
  }
}

function getFiles(ctx: Koa.Context) {
  return ctx?.request?.files?.files;
}

const bodyMiddleware: Core.MiddlewareFactory<Config> = (config, { strapi }) => {
  const bodyConfig: Config = defaultsDeep(defaults, config);

  let gqlEndpoint: string | undefined;
  if (strapi.plugin('graphql')) {
    const { config: gqlConfig } = strapi.plugin('graphql');
    gqlEndpoint = gqlConfig('endpoint');
  }

  return async (ctx, next) => {
    // TODO: find a better way later
    if (gqlEndpoint && ctx.url === gqlEndpoint) {
      await next();
    } else {
      try {
        await body(bodyConfig)(ctx, async () => {});

        const files = getFiles(ctx);

        /**
         * in case the mime-type wasn't sent, Strapi tries to guess it
         * from the file extension, to avoid a corrupt database state
         */
        if (files) {
          if (Array.isArray(files)) {
            files.forEach(ensureFileMimeType);
          } else {
            ensureFileMimeType(files);
          }
        }

        await next();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message &&
          error.message.includes('maxFileSize exceeded')
        ) {
          return ctx.payloadTooLarge('FileTooBig');
        }

        throw error;
      }
    }

    const files = getFiles(ctx);

    // clean any file that was uploaded
    if (files) {
      if (Array.isArray(files)) {
        // not awaiting to not slow the request
        Promise.all(files.map((file) => fse.remove(file.filepath)));
      } else if (files && files.filepath) {
        // not awaiting to not slow the request
        fse.remove(files.filepath);
      }
      delete ctx.request.files;
    }
  };
};

export { bodyMiddleware as body };
