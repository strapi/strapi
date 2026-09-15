import type { Rollup } from 'vite';

import { buildFilesPlugin } from './plugins';

const ctx = {
  cwd: process.cwd(),
  runtimeDir: `${process.cwd()}/.strapi/client`,
};

const generateBundle = (bundle: Rollup.OutputBundle) => {
  const plugin = buildFilesPlugin(ctx);
  const handler =
    typeof plugin.generateBundle === 'function'
      ? plugin.generateBundle
      : plugin.generateBundle!.handler;

  return handler.call({} as never, {} as never, bundle, false);
};

describe('buildFilesPlugin', () => {
  it('runs after the vite html plugin', () => {
    expect(buildFilesPlugin(ctx).enforce).toBe('post');
  });

  it('moves the html asset to the top level of the bundle', async () => {
    const asset = {
      type: 'asset',
      fileName: '.strapi/client/index.html',
      source: '<html></html>',
    } as Rollup.OutputBundle[string];
    const bundle: Rollup.OutputBundle = { '.strapi/client/index.html': asset };

    await generateBundle(bundle);

    expect(bundle['.strapi/client/index.html']).toBeUndefined();
    expect(bundle['index.html']).toBe(asset);
    expect(bundle['index.html'].fileName).toBe('index.html');
  });

  it('throws when the html asset is missing', async () => {
    await expect(generateBundle({})).rejects.toThrow(
      'Failed to find the html asset in bundle (.strapi/client/index.html)'
    );
  });
});
