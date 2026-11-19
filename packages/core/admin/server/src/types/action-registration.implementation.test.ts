// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type ActionProvider = Strapi.Registries.PackageServices['admin::permission']['actionProvider'];

declare const actionProvider: ActionProvider;

/** A `uid` known only at runtime: its computed ID is not checked against the registered IDs. */
declare const dynamicUid: string;

/** What `register` accepts for an action with a wide `uid`: the registration type itself. */
type ActionRegistration = Parameters<ActionProvider['register']>[0];

type SectionRegistration<TSection extends string> = Extract<
  ActionRegistration,
  { readonly section: TSection }
>;

// The registration type is the input of the runtime schema (`validation/action-provider.ts`), one
// member per section, readonly so `as const` lists are accepted.
export type ActionRegistrationAssertions = [
  Expect<
    Equal<[ActionRegistration['section']], ['contentTypes' | 'plugins' | 'settings' | 'internal']>
  >,
  // `subjects` is required for content types only, and its items may be `undefined`.
  Expect<
    Equal<[SectionRegistration<'contentTypes'>['subjects']], [readonly (string | undefined)[]]>
  >,
  Expect<Equal<[SectionRegistration<'plugins'>['pluginName']], [string]>>,
  Expect<Equal<[SectionRegistration<'settings'>['category']], [string]>>,
  Expect<Equal<[SectionRegistration<'internal'>['subjects']], [undefined]>>,
  // An alias may leave `actionId` out, and `applyToProperties` is not nullable.
  Expect<
    Equal<
      [NonNullable<NonNullable<ActionRegistration['aliases']>[number]>['actionId']],
      [string | undefined]
    >
  >,
  Expect<
    Equal<
      [NonNullable<ActionRegistration['options']>['applyToProperties']],
      [readonly (string | undefined)[] | undefined]
    >
  >,
];

// One registration per section, inline.
actionProvider.register({
  section: 'contentTypes',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
  subjects: ['api::article.article'],
  options: { applyToProperties: ['fields'] },
});
actionProvider.register({
  section: 'plugins',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
  subCategory: 'general',
});
actionProvider.register({
  section: 'settings',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
  category: 'marketplace',
});
actionProvider.register({
  section: 'internal',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
  aliases: [{ subjects: null }],
});

// An `as const` list, nested arrays included.
const actions = [
  {
    section: 'settings',
    category: 'webhooks',
    displayName: 'Read',
    uid: 'webhooks.read',
    pluginName: 'admin',
    options: { applyToProperties: ['fields'] },
  },
  { section: 'plugins', displayName: 'Read', uid: 'webhooks.create', pluginName: 'admin' },
] as const;
actionProvider.registerMany(actions);

// The CMS-2449 shape: the `plugins` section requires `pluginName`.
// @ts-expect-error `pluginName` is missing.
actionProvider.register({ section: 'plugins', displayName: 'Read', uid: dynamicUid });

// Each section rejects what the runtime schema rejects.
// @ts-expect-error `contentTypes` requires `subjects`.
actionProvider.register({
  section: 'contentTypes',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
});
// @ts-expect-error `settings` requires `category`.
actionProvider.register({
  section: 'settings',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
});
// @ts-expect-error `subjects` is only for the `contentTypes` section.
actionProvider.register({
  section: 'plugins',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
  subjects: ['api::article.article'],
});
// @ts-expect-error `category` is only for the `settings` section.
actionProvider.register({
  section: 'internal',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
  category: 'marketplace',
});
actionProvider.register({
  section: 'internal',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
  // @ts-expect-error `applyToProperties` is not nullable.
  options: { applyToProperties: null },
});
actionProvider.register({
  // @ts-expect-error `section` is one of the four sections.
  section: 'content-types',
  displayName: 'Read',
  uid: 'marketplace.read',
  pluginName: 'admin',
});

// A list not written `as const` types `section` as `string`, which matches no section.
const wideActions = [
  { section: 'plugins', displayName: 'Read', uid: 'marketplace.read', pluginName: 'admin' },
];
// @ts-expect-error `section: string` matches no section.
actionProvider.registerMany(wideActions);

// The registered ID check still applies.
actionProvider.register({
  section: 'plugins',
  displayName: 'Read',
  // @ts-expect-error `admin::marketplace.raed` is not a registered permission action.
  uid: 'marketplace.raed',
  pluginName: 'admin',
});
