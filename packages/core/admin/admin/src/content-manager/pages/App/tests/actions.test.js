import { setInitData } from '../actions';

describe('Content Manager | App | actions', () => {
  it('should format the setInitData action', () => {
    const authorizedCollectionTypeLinks = [{ title: 'addresses', uid: 'address' }];
    const authorizedSingleTypeLinks = [{ title: 'Home page', uid: 'homepage' }];
    const contentTypeSchemas = [
      { kind: 'singleType', uid: 'homepage' },
      { kind: 'collectionType', uid: 'address' },
    ];
    const components = [];

    const expected = {
      type: 'ContentManager/App/SET_INIT_DATA',
      data: {
        authorizedCollectionTypeLinks,
        authorizedSingleTypeLinks,
        contentTypeSchemas,
        components,
      },
    };

    expect(
      setInitData({
        authorizedCollectionTypeLinks,
        authorizedSingleTypeLinks,
        contentTypeSchemas,
        components,
      })
    ).toEqual(expected);
  });
});
