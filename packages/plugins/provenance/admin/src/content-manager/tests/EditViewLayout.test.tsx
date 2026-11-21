import { mutateEditViewHook } from '../EditViewLayout';

const layout = () => ({
  layout: {
    layout: [[[{ name: 'title', labelAction: 'globe' }, { name: 'seo' }]]],
    components: { 'prov.seo': { layout: [[{ name: 'metaTitle' }]] } },
  },
});

const at = (pathname: string) => window.history.pushState({}, '', pathname);

describe('mutateEditViewHook', () => {
  it('adds the label action to the top-level fields of API content types', () => {
    at('/admin/content-manager/collection-types/api::article.article/abc');

    const result = mutateEditViewHook(layout());
    const [title, seo] = result.layout.layout[0][0];

    expect(title.labelAction).toBeDefined();
    expect(title.labelAction).not.toBe('globe');
    expect(seo.labelAction).toBeDefined();
    // Fields inside components are tracked with their component
    expect(result.layout).toMatchObject({
      components: { 'prov.seo': { layout: [[{ name: 'metaTitle' }]] } },
    });
  });

  it('applies to single types too', () => {
    at('/admin/content-manager/single-types/api::homepage.homepage');

    expect(mutateEditViewHook(layout()).layout.layout[0][0][1].labelAction).toBeDefined();
  });

  it('leaves other content types and Content History untouched', () => {
    at('/admin/content-manager/collection-types/plugin::users-permissions.user/1');
    expect(mutateEditViewHook(layout())).toEqual(layout());

    at('/admin/content-manager/collection-types/api::article.article/abc/history');
    expect(mutateEditViewHook(layout())).toEqual(layout());
  });
});
