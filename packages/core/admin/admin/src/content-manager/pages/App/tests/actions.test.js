import { setInitData } from '../actions';

describe('Content Manager | App | actions', () => {
  it('should format the setInitData action', () => {
    const authorizedCtLinks = [{ title: 'addresses', uid: 'address' }];
    const authorizedStLinks = [{ title: 'Home page', uid: 'homepage' }];
    const contentTypeSchemas = [
      { kind: 'singleType', uid: 'homepage' },
      { kind: 'collectionType', uid: 'address' },
    ];
    const components = [];

    const expected = {
      type: 'ContentManager/App/SET_INIT_DATA',
      data: {
        authorizedCtLinks,
        authorizedStLinks,
        contentTypeSchemas,
        components,
      },
    };

    expect(
      setInitData({ authorizedCtLinks, authorizedStLinks, contentTypeSchemas, components })
    ).toEqual(expected);
  });
});
