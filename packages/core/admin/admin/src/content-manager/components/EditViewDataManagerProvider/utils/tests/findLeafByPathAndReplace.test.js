import { findLeafByPathAndReplace } from '../findLeafByPathAndReplace';

describe('findLeafByPathAndReplace', () => {
  it('should replace the value of the leaf by the provided one when the tree is an object with no arrays', () => {
    const obj = {
      a: {
        b: {
          c: 'd',
        },
      },
    };

    const path = ['a', 'b', 'c'];

    const [lastPath] = path.slice(-1);

    const findLeaf = findLeafByPathAndReplace(lastPath, []);

    path.reduce(findLeaf, obj);

    expect(obj).toMatchObject({
      a: {
        b: {
          c: [],
        },
      },
    });
  });

  it('should replace the value of the leaf by the provided one for all cases in the event of the leaf being a branch of an array', () => {
    const obj = {
      a: {
        b: [
          {
            c: 'd',
          },
          {
            c: 'd',
          },
        ],
      },
    };

    const path = ['a', 'b', 'c'];

    const [lastPath] = path.slice(-1);

    const findLeaf = findLeafByPathAndReplace(lastPath, []);

    path.reduce(findLeaf, obj);

    expect(obj).toMatchObject({
      a: {
        b: [
          {
            c: [],
          },
          {
            c: [],
          },
        ],
      },
    });
  });

  it('should only replace the leaf declared no matter how many duplicate exist higher in the tree', () => {
    const obj = {
      a: {
        b: [
          {
            c: false,
            d: {
              e: [
                {
                  f: {
                    c: false,
                  },
                },
                {
                  f: {
                    c: false,
                  },
                },
              ],
            },
          },
        ],
        c: false,
      },
    };

    const path = ['a', 'b', 'd', 'e', 'f', 'c'];

    const [lastPath] = path.slice(-1);

    const findLeaf = findLeafByPathAndReplace(lastPath, []);

    path.reduce(findLeaf, obj);

    expect(obj).toMatchObject({
      a: {
        b: [
          {
            c: false,
            d: {
              e: [
                {
                  f: {
                    c: [],
                  },
                },
                {
                  f: {
                    c: [],
                  },
                },
              ],
            },
          },
        ],
        c: false,
      },
    });
  });
});
