import { defineApp } from '../define-app';
import { isAppDefinition } from '../brand';
import { fromDisk } from '../sources';
import * as is from '../attributes';

describe('defineApp', () => {
  it('brands and returns a typed definition', () => {
    const app = defineApp({
      contentTypes: [
        {
          singularName: 'article',
          pluralName: 'articles',
          displayName: 'Article',
          attributes: { title: is.string({ required: true }) },
        },
      ],
      routes: ({ post }) => [post('/echo', (ctx) => ({ youSent: ctx.request.body }))],
      bootstrap() {},
    });

    expect(isAppDefinition(app)).toBe(true);
    expect(app.contentTypes).toHaveLength(1);
  });

  it('preserves the original fields', () => {
    const bootstrap = () => {};
    const app = defineApp({ bootstrap, controllers: fromDisk('./src/controllers') });

    expect(app.bootstrap).toBe(bootstrap);
    expect(app.controllers).toEqual(fromDisk('./src/controllers'));
  });

  it('does not mutate the input object', () => {
    const input = { bootstrap() {} };
    const app = defineApp(input);
    expect(input).not.toBe(app);
    expect(Object.getOwnPropertySymbols(input)).toHaveLength(0);
  });

  it('accepts fromDisk sources for resources', () => {
    expect(() =>
      defineApp({
        config: fromDisk('./config'),
        contentTypes: fromDisk('./src/api'),
        plugins: fromDisk('./'),
        from: fromDisk('./legacy-app'),
      })
    ).not.toThrow();
  });

  describe('shape validation', () => {
    it('rejects a non-object definition', () => {
      // @ts-expect-error testing runtime guard
      expect(() => defineApp(42)).toThrow(TypeError);
    });

    it('rejects invalid contentTypes', () => {
      // @ts-expect-error testing runtime guard
      expect(() => defineApp({ contentTypes: 'nope' })).toThrow(/contentTypes/);
    });

    it('rejects invalid routes', () => {
      // @ts-expect-error testing runtime guard
      expect(() => defineApp({ routes: 42 })).toThrow(/routes/);
    });

    it('rejects invalid plugins', () => {
      // @ts-expect-error testing runtime guard
      expect(() => defineApp({ plugins: 42 })).toThrow(/plugins/);
    });

    it('rejects a non-disk `from`', () => {
      // @ts-expect-error testing runtime guard
      expect(() => defineApp({ from: { path: './x' } })).toThrow(/from/);
    });

    it('rejects non-function lifecycles', () => {
      // @ts-expect-error testing runtime guard
      expect(() => defineApp({ bootstrap: 'nope' })).toThrow(/bootstrap/);
    });
  });
});
