declare const GUIDED_TOUR_REQUIRED_ACTIONS: {
    readonly contentTypeBuilder: {
        readonly createSchema: "didCreateContentTypeSchema";
        readonly addField: "didAddFieldToSchema";
    };
    readonly contentManager: {
        readonly createContent: "didCreateContent";
    };
    readonly apiTokens: {
        readonly createToken: "didCreateApiToken";
        readonly copyToken: "didCopyApiToken";
    };
    readonly strapiCloud: {};
};
export { GUIDED_TOUR_REQUIRED_ACTIONS };
