/**
 * Optional explicit GraphQL HTTP server selection (opt-in).
 * When omitted, legacy `apolloServer` maps to Apollo v4 (default).
 */
export type GraphqlPluginServerConfig =
  | GraphqlPluginApolloServerConfig
  | GraphqlPluginTailcallServerConfig;

export interface GraphqlPluginApolloServerConfig {
  provider: 'apollo';
  /** Defaults to `4` when omitted. */
  version?: 4 | 5;
  /** Provider-specific options (merged into Apollo Server like legacy `apolloServer`). */
  options?: Record<string, unknown>;
}

/** Reserved for a future release; do not use yet. */
export interface GraphqlPluginTailcallServerConfig {
  provider: 'tailcall';
  options?: Record<string, unknown>;
}
