/**
 * Client
 */
export default ({ client }: { client: string }) => {
  switch (client) {
    case 'sqlite-legacy':
      return 'sqlite';
    default:
      return client;
  }
};
