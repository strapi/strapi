export default ({ nexus }) => {
  return nexus.objectType({
    name: 'UsersPermissionsDeleteRolePayload',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
