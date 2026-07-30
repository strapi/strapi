export default (destination: string) => {
  if (destination === 'api') {
    return `api/{{ api }}`;
  }

  if (destination === 'plugin') {
    return `plugins/{{ plugin }}/server/src`;
  }

  if (destination === 'root') {
    return '.';
  }

  return `api/{{ id }}`;
};
