const GUIDED_TOUR_REQUIRED_ACTIONS = {
  contentTypeBuilder: {
    createSchema: 'didCreateContentTypeSchema',
    addField: 'didAddFieldToSchema',
  },
  contentManager: {
    createContent: 'didCreateContent',
  },
  apiTokens: {
    createToken: 'didCreateApiToken',
    copyToken: 'didCopyApiToken',
  },
  strapiCloud: {},
} as const;

export { GUIDED_TOUR_REQUIRED_ACTIONS };
