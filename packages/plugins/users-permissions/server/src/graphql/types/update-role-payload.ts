export default ({ nexus }) => {
  return nexus.objectType({
    name: 'UsersPermissionsUpdateRolePayload',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
