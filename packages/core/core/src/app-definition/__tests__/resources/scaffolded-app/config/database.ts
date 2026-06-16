export default () => ({
  connection: {
    client: 'sqlite',
    connection: { filename: '.tmp/data.db' },
    useNullAsDefault: true,
  },
});
