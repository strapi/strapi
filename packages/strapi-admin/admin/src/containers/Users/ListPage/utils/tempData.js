const pagination = {
  page: 1,
  pageSize: 10,
  pageCount: 5,
  total: 20,
};

const rows = [
  {
    id: 1,
    firstname: 'Soup',
    lastname: 'Soup',
    username: 'test',
    email: 't@t.com',
    isActive: true,
    roles: ['super admin'],
  },
  {
    id: 2,
    firstname: 'Soup',
    lastname: 'Soup',
    username: 'test',
    email: 't@t.com',
    isActive: false,
    roles: [
      'super admin',
      'Author',
      'editor',
      'soup',
      'ml',
      'ml',
      'super admin',
      'Author',
      'editor',
      'soup',
      'ml',
      'ml',
    ],
  },
  {
    id: 3,
    firstname: 'Pierre',
    lastname: 'Gagnaire',
    username: 'test',
    email: 't@t.com',
    isActive: true,
    roles: ['super admin'],
  },
  {
    id: 4,
    firstname: 'Pierre',
    lastname: 'Gagnaire',
    username: 'test',
    email: 't@t.com',
    isActive: true,
    roles: ['super admin'],
  },
  {
    id: 5,
    firstname: 'Pierre',
    lastname: 'Gagnaire',
    username: 'test',
    email: 't@t.com',
    isActive: true,
    roles: ['super admin'],
  },
];

console.log('ooo');

export { pagination, rows };
