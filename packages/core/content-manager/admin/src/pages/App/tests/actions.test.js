import { setContentTypeLinks } from '../actions';

describe('Content Manager | App | actions', () => {
  it('should format the setContentTypeLinks action', () => {
    const authorizedCtLinks = [{ title: 'addresses', uid: 'address' }];
    const authorizedStLinks = [{ title: 'Home page', uid: 'homepage' }];
    const models = [
      { kind: 'singleType', uid: 'homepage' },
      { kind: 'collectionType', uid: 'address' },
    ];
    const components = [];

    const expected = {
      type: 'ContentManager/App/SET_CONTENT_TYPE_LINKS',
      data: {
        authorizedCtLinks,
        authorizedStLinks,
        contentTypeSchemas: models,
        components,
      },
    };

    expect(setContentTypeLinks(authorizedCtLinks, authorizedStLinks, models, components)).toEqual(
      expected
    );
  });
});
