const displayedFilters = [
  {
    name: 'createdAt',
    fieldSchema: {
      type: 'date',
    },
    metadatas: { label: 'createdAt' },
  },
  {
    name: 'updatedAt',
    fieldSchema: {
      type: 'date',
    },
    metadatas: { label: 'updatedAt' },
  },
  {
    name: 'mime',
    fieldSchema: {
      type: 'enumeration',
      options: [
        { label: 'image', value: 'image' },
        { label: 'video', value: 'video' },
        { label: 'file', value: 'file' },
      ],
    },
    metadatas: { label: 'type' },
  },
];

export default displayedFilters;
