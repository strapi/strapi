type StreamChainModule = typeof import('stream-chain');
type JsonlParserModule = typeof import('stream-json/jsonl/parser.js');
type JsonlStringerModule = typeof import('stream-json/jsonl/stringer.js');

export interface StreamDeps {
  chain: StreamChainModule['chainUnchecked'];
  parser: JsonlParserModule['parser'];
  stringer: JsonlStringerModule['stringer'];
}

let cached: Promise<StreamDeps> | undefined;

/**
 * Loads stream-chain and stream-json via dynamic import (CJS-safe) and caches them.
 * Both packages are ESM-only, so they cannot be loaded with require() on Node < 20.19 / 22.12
 * or under Jest's --experimental-vm-modules.
 */
export const loadStreamDeps = (): Promise<StreamDeps> => {
  cached ??= Promise.all([
    import('stream-chain'),
    // Extension is required: stream-json's export map does not resolve the extensionless subpath.
    import('stream-json/jsonl/parser.js'), // eslint-disable-line import/extensions
    import('stream-json/jsonl/stringer.js'), // eslint-disable-line import/extensions
  ]).then(([streamChain, jsonlParser, jsonlStringer]) => ({
    chain: streamChain.chainUnchecked,
    parser: jsonlParser.parser,
    stringer: jsonlStringer.stringer,
  }));

  return cached;
};
