import getFirstSortableHeader from '../getFirstSortableHeader';

describe('CONTENT MANAGER | containers | ListView | utils | getFirstSortableHeader', () => {
  it('should return id if the array is empty', () => {
    expect(getFirstSortableHeader([])).toEqual('id');
  });

  it('should return the first sortable element', () => {
    const headers = [
      {
        name: 'un',
        metadatas: { sortable: false },
      },
      {
        name: 'two',
        metadatas: { sortable: true },
      },
      {
        name: 'three',
        metadatas: { sortable: true },
      },
    ];

    expect(getFirstSortableHeader(headers)).toBe('two');
  });
});
