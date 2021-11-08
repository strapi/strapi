const displayedFilters = [
  {
    name: 'firstname',
    metadatas: { label: 'Firstname' },
    fieldSchema: { type: 'string' },
  },
  {
    name: 'lastname',
    metadatas: { label: 'Lastname' },
    fieldSchema: { type: 'string' },
  },
  {
    name: 'email',
    metadatas: { label: 'Email' },
    fieldSchema: { type: 'email' },
  },
  {
    name: 'username',
    metadatas: { label: 'Username' },
    fieldSchema: { type: 'string' },
  },
  {
    name: 'isActive',
    metadatas: { label: 'Active user' },
    fieldSchema: { type: 'boolean' },
  },
];

export default displayedFilters;
