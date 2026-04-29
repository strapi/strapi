export default ({ env }) => ({
  future: {
    unstableContentTypeBuilderIndexing: env.bool('UNSTABLE_CONTENT_TYPE_BUILDER_INDEXING', true),
  },
});
