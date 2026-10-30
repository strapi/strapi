import type { Rollup } from 'vite';

import { buildFilesPlugin } from './plugins';

type BuildFilesContext = Parameters<typeof buildFilesPlugin>[0];

const ctx: BuildFilesContext = {
  cwd: process.cwd(),
  runtimeDir: `${process.cwd()}/.strapi/client`,
};

const callGenerateBundle = (
  plugin: ReturnType<typeof buildFilesPlugin>,
  bundle: Rollup.OutputBundle,
  self: unknown = {}
) => {
  const handler =
    typeof plugin.generateBundle === 'function'
      ? plugin.generateBundle
      : plugin.generateBundle!.handler;

  return handler.call(self as never, {} as never, bundle, false);
};

const generateBundle = (bundle: Rollup.OutputBundle) =>
  callGenerateBundle(buildFilesPlugin(ctx), bundle);

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

  describe('options', () => {
    const html = `${process.cwd()}/.strapi/client/index.html`;
    const options = (input?: Rollup.InputOption) => {
      const hook = buildFilesPlugin(ctx).options;
      const handler = typeof hook === 'function' ? hook : hook!.handler;

      return handler.call({} as never, { input });
    };

    it('keeps an input that has the html entry', () => {
      expect(options({ strapi: html })).toBeNull();
      expect(options([html])).toBeNull();
    });

    it('adds the html entry to a replaced input', () => {
      expect(options('/app/extra.ts')).toEqual({ input: ['/app/extra.ts', html] });
      expect(options(['/app/extra.ts'])).toEqual({ input: ['/app/extra.ts', html] });
      expect(options({ strapi: '/app/extra.ts' })).toEqual({
        input: { strapi: '/app/extra.ts', 'strapi-admin': html },
      });
    });
  });

  it('throws when the html asset is missing', async () => {
    await expect(generateBundle({})).rejects.toThrow(
      'Failed to find the html asset in bundle (.strapi/client/index.html)'
    );
  });
});
