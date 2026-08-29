export default ({ nexus }) => {
  return nexus.objectType({
    name: 'UsersPermissionsCreateRolePayload',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
