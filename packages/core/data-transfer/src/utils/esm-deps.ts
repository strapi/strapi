type StreamChainModule = typeof import('stream-chain');
type JsonlParserStreamModule = typeof import('stream-chain/jsonl/parserStream.js');
type JsonlStringerStreamModule = typeof import('stream-chain/jsonl/stringerStream.js');

export interface StreamDeps {
  chain: StreamChainModule['chainUnchecked'];
  parser: JsonlParserStreamModule['parserStream'];
  stringer: JsonlStringerStreamModule['stringerStream'];
}

let cached: Promise<StreamDeps> | undefined;

/**
 * Loads stream-chain via dynamic import (CJS-safe) and caches it.
 * The package is ESM-only, so it cannot be loaded with require() on Node < 20.19 / 22.12
 * or under Jest without --experimental-vm-modules.
 */
export const loadStreamDeps = (): Promise<StreamDeps> => {
  cached ??= Promise.all([
    import('stream-chain'),
    // Extension is required: stream-chain's "./*" export does not resolve the extensionless subpath.
    import('stream-chain/jsonl/parserStream.js'), // eslint-disable-line import/extensions
    import('stream-chain/jsonl/stringerStream.js'), // eslint-disable-line import/extensions
  ]).then(([streamChain, jsonlParser, jsonlStringer]) => ({
    chain: streamChain.chainUnchecked,
    parser: jsonlParser.parserStream,
    stringer: jsonlStringer.stringerStream,
  }));

  return cached;
};
