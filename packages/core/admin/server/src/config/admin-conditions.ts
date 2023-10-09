// TODO: TS User and role type
type User = any;
type Role = any;

export const conditions = [
  {
    displayName: 'Is creator',
    name: 'is-creator',
    plugin: 'admin',
    handler: (user: User) => ({ 'createdBy.id': user.id }),
  },
  {
    displayName: 'Has same role as creator',
    name: 'has-same-role-as-creator',
    plugin: 'admin',
    handler: (user: User) => ({
      'createdBy.roles': {
        $elemMatch: {
          id: {
            $in: user.roles.map((r: Role) => r.id),
          },
        },
      },
    }),
  },
];

export default {
  conditions,
};
