const GUIDED_TOUR_REQUIRED_ACTIONS = {
  contentTypeBuilder: {
    createSchema: 'didCreateContentTypeSchema',
    addField: 'didAddFieldToSchema',
  },
  contentManager: {
    createContent: 'didCreateContent',
  },
  apiTokens: {
    copyToken: 'didCopyApiToken',
    createToken: 'didCreateApiToken',
  },
  strapiCloud: {},
};

export { GUIDED_TOUR_REQUIRED_ACTIONS };
