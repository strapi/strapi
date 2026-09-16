import type { McpCapabilityHandlerContext } from '../mcp';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

type ExpectedContextKeys =
  | 'signal'
  | 'requestId'
  | 'sessionId'
  | 'authInfo'
  | '_meta'
  | 'requestInfo';

true satisfies Assert<IsEqual<keyof McpCapabilityHandlerContext, ExpectedContextKeys>>;

const contextWithEveryMemberAbsent = {} satisfies McpCapabilityHandlerContext;

const readRetainedMembers = (context: McpCapabilityHandlerContext) => ({
  cancelled: context.signal?.aborted,
  requestId: context.requestId,
  sessionId: context.sessionId,
  token: context.authInfo?.token,
  metadata: context._meta,
  authorization: context.requestInfo?.headers.authorization,
});

const assertExcludedMembersStayExcluded = (context: McpCapabilityHandlerContext) => [
  // @ts-expect-error Server-initiated notifications are not part of Strapi's contract.
  context.sendNotification,
  // @ts-expect-error Server-initiated requests are not part of Strapi's contract.
  context.sendRequest,
  // @ts-expect-error Stream-closing controls are not part of Strapi's contract.
  context.closeSSEStream,
  // @ts-expect-error Stream-closing controls are not part of Strapi's contract.
  context.closeStandaloneSSEStream,
  // @ts-expect-error Withdrawn task facilities are not part of Strapi's contract.
  context.taskId,
  // @ts-expect-error Withdrawn task facilities are not part of Strapi's contract.
  context.taskStore,
  // @ts-expect-error Withdrawn task facilities are not part of Strapi's contract.
  context.taskRequestedTtl,
  // @ts-expect-error The underlying SDK request context is not exposed.
  context.mcpReq,
  // @ts-expect-error The underlying SDK HTTP context is not exposed.
  context.http,
  // @ts-expect-error No generic SDK context escape hatch exists.
  context.sdkContext,
];

readRetainedMembers(contextWithEveryMemberAbsent);
assertExcludedMembersStayExcluded(contextWithEveryMemberAbsent);
