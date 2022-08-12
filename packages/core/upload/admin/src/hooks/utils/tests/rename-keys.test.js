import { recursiveRenameKeys } from '../rename-keys';

const FIXTURE = {
  foo: 'bar',
  bar: 'foo',

  nested: {
    foo: 'baz',
    baz: 'bar',

    deeper: {
      foo: false,
      bam: true,
    },
  },
};

describe('recursiveRenameKeys', () => {
  test('does rename keys', () => {
    expect(
      recursiveRenameKeys(FIXTURE, (key) => {
        switch (key) {
          case 'foo':
            return 'bam';

          case 'baz':
            return 'bar';

          default:
            return key;
        }
      })
    ).toStrictEqual({
      bam: 'bar',
      bar: 'foo',
      nested: {
        bam: 'baz',
        bar: 'bar',
        deeper: {
          bam: true,
        },
      },
    });
  });
});
