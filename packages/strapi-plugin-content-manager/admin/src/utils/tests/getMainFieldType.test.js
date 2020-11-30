import getMainFieldType from '../getMainFieldType';

describe('CONTENT MANAGER | UTILS | getMainFieldType', () => {
  const editRelationsSchemas = [
    {
      name: 'categories',
      metadatas: {
        mainFieldSchema: {
          type: 'string',
        },
      },
    },
    {
      name: 'likes',
      metadatas: {
        mainFieldSchema: {
          type: 'number',
        },
      },
    },
  ];
  it('should return null if the relation schema does not exist', () => {
    expect(getMainFieldType(editRelationsSchemas, 'address')).toEqual(null);
  });
  it('should return the main field type', () => {
    expect(getMainFieldType(editRelationsSchemas, 'categories')).toEqual('string');
  });
});
