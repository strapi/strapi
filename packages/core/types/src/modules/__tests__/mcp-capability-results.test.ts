import type {
  McpContentBlock,
  McpPromptCallback,
  McpPromptResult,
  McpResourceCallback,
  McpResourceListingMetadata,
  McpResourceReadResult,
  McpToolHandlerReturn,
  McpToolResult,
} from '../mcp';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

/**
 * The established handler-return name keeps pointing at the same contract, so
 * source annotated with either name behaves identically.
 */
true satisfies Assert<IsEqual<McpToolHandlerReturn, McpToolResult>>;

/** Every content variant Strapi accepts today, with its nested and extension fields. */
const everyContentVariant = [
  { type: 'text', text: 'plain' },
  {
    type: 'text',
    text: 'annotated',
    annotations: { audience: ['user'], priority: 0.5, lastModified: '2026-09-02T10:00:00Z' },
    _meta: { 'vendor.example/trace': 'abc' },
  },
  { type: 'image', data: 'aGk=', mimeType: 'image/png' },
  {
    type: 'image',
    data: 'aGk=',
    mimeType: 'image/png',
    annotations: { audience: ['assistant'] },
    _meta: { 'vendor.example/frames': 2 },
  },
  { type: 'audio', data: 'aGk=', mimeType: 'audio/wav' },
  {
    type: 'audio',
    data: 'aGk=',
    mimeType: 'audio/wav',
    annotations: { priority: 1 },
    _meta: { 'vendor.example/duration': 3 },
  },
  { type: 'resource_link', name: 'minimal-link', uri: 'strapi://app/minimal' },
  {
    type: 'resource_link',
    name: 'full-link',
    uri: 'strapi://app/full',
    title: 'Full link',
    description: 'Every listing attribute',
    mimeType: 'application/json',
    size: 42,
    icons: [{ src: 'strapi://icon.png', mimeType: 'image/png', sizes: ['16x16'], theme: 'light' }],
    annotations: { audience: ['user', 'assistant'], priority: 0 },
    _meta: { 'vendor.example/source': 'listing' },
  },
  {
    type: 'resource',
    resource: { uri: 'strapi://app/text', mimeType: 'text/plain', text: 'inline' },
  },
  {
    type: 'resource',
    resource: {
      uri: 'strapi://app/blob',
      mimeType: 'application/octet-stream',
      blob: 'aGk=',
      _meta: { 'vendor.example/checksum': 'deadbeef' },
    },
    annotations: { priority: 0.25 },
    _meta: { 'vendor.example/embedded': true },
  },
] satisfies McpContentBlock[];

/** A successful tool result carries structured data; an error result never does. */
const successfulToolResult = {
  content: everyContentVariant,
  structuredContent: { anything: 'goes' },
} satisfies McpToolResult;

const erroredToolResult = {
  content: [{ type: 'text', text: 'failed' }],
  isError: true,
} satisfies McpToolResult;

const toolBranchesStayMutuallyExclusive = () => [
  // @ts-expect-error An error result cannot carry successful structured data.
  { content: [], isError: true, structuredContent: {} } satisfies McpToolResult,
  // @ts-expect-error A successful result must carry structured data.
  { content: [] } satisfies McpToolResult,
];

const promptResultWithEveryMember = {
  description: 'Every prompt member',
  messages: [
    { role: 'user', content: { type: 'text', text: 'from the user' } },
    { role: 'assistant', content: everyContentVariant[7] },
  ],
  _meta: { 'vendor.example/prompt': 'meta' },
  'vendor.example/top-level': { nested: true },
} satisfies McpPromptResult;

const resourceReadResultWithEveryMember = {
  contents: [
    { uri: 'strapi://app/text', text: 'text contents' },
    { uri: 'strapi://app/blob', mimeType: 'image/png', blob: 'aGk=', _meta: { size: 2 } },
  ],
  _meta: { 'vendor.example/resource': 'meta' },
  'vendor.example/top-level': 'extension',
} satisfies McpResourceReadResult;

const listingMetadataWithEveryAttribute = {
  title: 'App info',
  description: 'Metadata about the app',
  mimeType: 'application/json',
  size: 128,
  icons: [{ src: 'strapi://icon.svg', theme: 'dark' }],
  annotations: { audience: ['user'], priority: 0.75, lastModified: '2026-09-02T10:00:00Z' },
  _meta: { 'vendor.example/listing': true },
} satisfies McpResourceListingMetadata;

/**
 * A capability author annotating every result explicitly needs nothing but Strapi
 * types — this file imports no SDK type at all.
 */
const promptHandler: McpPromptCallback<undefined> = async (): Promise<McpPromptResult> =>
  promptResultWithEveryMember;

const resourceHandler: McpResourceCallback = async (uri): Promise<McpResourceReadResult> => ({
  contents: [{ uri: uri.href, text: 'read contents' }],
});

/** Protocol constructs Strapi has not adopted stay outside the owned contract. */
const unadoptedProtocolConstructs = () => [
  // @ts-expect-error Sampling tool-use content is not part of Strapi's contract.
  { type: 'tool_use', name: 'x', id: '1', input: {} } satisfies McpContentBlock,
  // @ts-expect-error Multi-round-trip input-required results are not part of Strapi's contract.
  { resultType: 'input_required', inputRequests: [] } satisfies McpPromptResult,
  // @ts-expect-error Resource listing metadata carries no read contents.
  listingMetadataWithEveryAttribute satisfies McpResourceReadResult,
  // @ts-expect-error Resource read contents are not a listing attribute.
  { contents: [] } satisfies McpResourceListingMetadata,
];

const assertAssignable = <T>(value: T) => value;

assertAssignable<McpToolResult>(successfulToolResult);
assertAssignable<McpToolResult>(erroredToolResult);
assertAssignable<McpResourceReadResult>(resourceReadResultWithEveryMember);
assertAssignable<McpPromptCallback<undefined>>(promptHandler);
assertAssignable<McpResourceCallback>(resourceHandler);
toolBranchesStayMutuallyExclusive();
unadoptedProtocolConstructs();
