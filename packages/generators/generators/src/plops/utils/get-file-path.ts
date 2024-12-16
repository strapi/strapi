export default (destination: string) => {
  if (destination === 'api') {
    return `src/api/{{ api }}`;
  }

  if (destination === 'plugin') {
    return `src/plugins/{{ plugin }}/server`;
  }

  if (destination === 'root') {
    return 'src';
  }

  return `src/api/{{ id }}`;
};
