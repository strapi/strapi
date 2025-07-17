import { transformUidToValidOpenApiName } from '../validation/utilities';

describe('transformUidToValidOpenApiName', () => {
  describe('component UIDs', () => {
    it('should transform basic component UIDs correctly', () => {
      expect(transformUidToValidOpenApiName('basic.seo')).toBe('BasicSeoEntry');
      expect(transformUidToValidOpenApiName('layout.hero')).toBe('LayoutHeroEntry');
      expect(transformUidToValidOpenApiName('shared.button')).toBe('SharedButtonEntry');
    });

    it('should handle kebab-case and snake_case in component names', () => {
      expect(transformUidToValidOpenApiName('basic.seo-meta')).toBe('BasicSeoMetaEntry');
      expect(transformUidToValidOpenApiName('layout.hero_section')).toBe('LayoutHeroSectionEntry');
    });
  });

  describe('API content type UIDs', () => {
    it('should transform API content type UIDs correctly', () => {
      expect(transformUidToValidOpenApiName('api::category.category')).toBe(
        'ApiCategoryCategoryDocument'
      );
      expect(transformUidToValidOpenApiName('api::article.article')).toBe(
        'ApiArticleArticleDocument'
      );
      expect(transformUidToValidOpenApiName('api::product.product')).toBe(
        'ApiProductProductDocument'
      );
    });

    it('should handle kebab-case and snake_case in API content types', () => {
      expect(transformUidToValidOpenApiName('api::blog-post.blog-post')).toBe(
        'ApiBlogPostBlogPostDocument'
      );
      expect(transformUidToValidOpenApiName('api::user_profile.user_profile')).toBe(
        'ApiUserProfileUserProfileDocument'
      );
    });
  });

  describe('plugin UIDs', () => {
    it('should transform plugin UIDs correctly', () => {
      expect(transformUidToValidOpenApiName('plugin::upload.file')).toBe(
        'PluginUploadFileDocument'
      );
      expect(transformUidToValidOpenApiName('plugin::users-permissions.user')).toBe(
        'PluginUsersPermissionsUserDocument'
      );
      expect(transformUidToValidOpenApiName('plugin::i18n.locale')).toBe(
        'PluginI18nLocaleDocument'
      );
    });
  });

  describe('other namespaced UIDs', () => {
    it('should handle other namespaced UIDs generically', () => {
      expect(transformUidToValidOpenApiName('admin::user.user')).toBe('AdminUserUserDocument');
      expect(transformUidToValidOpenApiName('custom::service.service')).toBe(
        'CustomServiceServiceDocument'
      );
    });
  });

  describe('simple UIDs', () => {
    it('should handle simple UIDs without dots or colons', () => {
      expect(transformUidToValidOpenApiName('user')).toBe('UserSchema');
      expect(transformUidToValidOpenApiName('product-category')).toBe('ProductCategorySchema');
      expect(transformUidToValidOpenApiName('blog_post')).toBe('BlogPostSchema');
    });
  });
});
