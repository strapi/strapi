/**
 * No contract export: type generation registers the type this factory returns. Do not check it
 * with `Core.ServiceFactory<'api::legacy.legacy'>`: that check reads the type it defines (TS7022).
 */
export default () => ({
  ping: () => 'pong' as const,
});
