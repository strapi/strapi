export default ({ nexus }) => {
  return nexus.objectType({
    name: 'UsersPermissionsPasswordPayload',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
