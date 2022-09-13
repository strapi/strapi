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
        { label: 'audio', value: 'audio' },
        { label: 'file', value: 'file' },
        { label: 'image', value: 'image' },
        { label: 'video', value: 'video' },
      ],
    },
    metadatas: { label: 'type' },
  },
];

export default displayedFilters;
