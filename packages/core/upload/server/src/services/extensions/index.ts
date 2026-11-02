import { async } from '@strapi/utils';
import { createSignCache, signEntityMedia, unsignEntityMedia } from './utils';

const signFileUrlsOnDocumentService = async () => {
  const { provider } = strapi.plugins.upload;
  const isPrivate = await provider.isPrivate();

  // We only need to sign the file urls if the provider is private
  if (!isPrivate) {
    return;
  }

  strapi.documents.use(async (ctx, next) => {
    const uid = ctx.uid;

    // One presign per distinct richtext URL for this call, whichever entry it
    // appears in. Scoped to the call: a signed URL is only as fresh as the
    // request that produced it.
    const cache = createSignCache();

    // Never persist a signature: richtext / blocks embed the URL itself, so an
    // expiring one would be frozen in the row. `clone` is included because the
    // submitted data is merged over the source row, so it can carry signed
    // values too. The response is signed again below, so callers still get a
    // usable URL back.
    if (
      (ctx.action === 'create' || ctx.action === 'update' || ctx.action === 'clone') &&
      ctx.params?.data
    ) {
      ctx.params.data = await unsignEntityMedia(ctx.params.data, uid, cache);
    }

    const result: any = await next();

    if (ctx.action === 'findMany') {
      // Shape: [ entry ]
      return async.map(result, (entry: any) => signEntityMedia(entry, uid, cache));
    }

    if (
      ctx.action === 'findFirst' ||
      ctx.action === 'findOne' ||
      ctx.action === 'create' ||
      ctx.action === 'update'
    ) {
      // Shape: entry
      return signEntityMedia(result, uid, cache);
    }

    if (
      ctx.action === 'delete' ||
      ctx.action === 'clone' ||
      ctx.action === 'publish' ||
      ctx.action === 'unpublish' ||
      ctx.action === 'discardDraft'
    ) {
      // Shape: { entries: [ entry ] }
      // ...
      return {
        ...result,
        entries: await async.map(result.entries, (entry: any) =>
          signEntityMedia(entry, uid, cache)
        ),
      };
    }

    return result;
  });
};

export default {
  signFileUrlsOnDocumentService,
};
