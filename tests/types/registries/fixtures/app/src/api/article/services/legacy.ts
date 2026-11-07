// No contract export: the service registers the type its factory returns.
export default () => ({
  ping: () => 'pong' as const,
});
