import { mutateEditViewLayoutHook } from '../editView';

describe('mutateEditViewLayoutHook', () => {
  it('should forward when i18n is not enabled on the content type', () => {
    const layout = {
      components: {},
      contentType: {
        uid: 'test',
        pluginOptions: { i18n: { localized: false } },
        layouts: {
          edit: ['test'],
        },
      },
    };

    const data = {
      layout,
    };

    // @ts-expect-error – test purpose
    const results = mutateEditViewLayoutHook(data);

    expect(results).toEqual(data);
  });

  it('should forward the action when i18n is enabled and the query.locale is not defined', () => {
    const layout = {
      components: {},
      contentType: {
        uid: 'test',
        pluginOptions: { i18n: { localized: true } },
        layouts: {
          edit: [],
        },
      },
    };

    const data = {
      layout,
    };

    // @ts-expect-error – test purpose
    const results = mutateEditViewLayoutHook(data);

    expect(results).toEqual(data);
  });
});
